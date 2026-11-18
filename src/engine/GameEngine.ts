import { DEFAULT_STARTING_POSITION } from '@/constants'
import {
	BaseGameEngine,
	combatEngine,
	getInteractionEngine,
	inputManager,
	InteractionEngine,
	type InteractionHost,
} from '@/engine'
import {
	CharacterStorageService,
	dialogService,
	EncounterService,
	SaveGameService,
	zoneLoaderService,
} from '@/services'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useDialogStore } from '@/store/useDialogStore'
import { useContentStore } from '@/store/useContentStore'
import { useGameStore } from '@/store/useGameStore'
import type { CharacterSheetContext, Position, SaveGameDocument } from '@/types'
import type { TileDef } from '@shared/types'
import {
	addPlacement,
	addToInventory,
	findPortalAt,
	fitsInInventory,
	generateSaveGameId,
	lookupPlacementDef,
	removeFromInventory,
} from '@/utils'

// TODO [Game 7]: regions (dialog files) and zones are keyed differently until
// portals and saves carry a zone `_id`. Bridge: region id -> the zone's `id`.
const REGION_ZONE_IDS: Record<string, string> = {
	starter_town: 'STARTING_TOWN',
}
const regionToZoneId = (regionId: string): string =>
	REGION_ZONE_IDS[regionId] ?? regionId

export class GameEngine extends BaseGameEngine {
	private interactiveEngine: InteractionEngine = getInteractionEngine()
	private isInitialized = false
	private unbindWorldInput?: () => void
	private gameTime: number = 0

	public override async initialize(): Promise<void> {
		if (this.isInitialized) return
		inputManager.attachListeners()
		await super.initialize()
		this.isInitialized = true
	}

	protected async loadAssets(): Promise<void> {
		if (this.isInitialized || useGameStore.getState().isMapLoading) return
		useGameStore.setState({ isMapLoading: true })

		try {
			const characters = CharacterStorageService.getAll()
			const [, startingZone, monsters] = await Promise.all([
				useContentStore.getState().loadDefs(),
				zoneLoaderService.loadByDisplayId(regionToZoneId('starter_town')),
				EncounterService.fetchMonsters(),
			])
			useCharacterCreationStore.setState({
				createdCharacters: characters,
			})
			useGameStore.getState().setCurrentZone(startingZone)
			useGameStore.setState({ isMapLoading: false, monsters })
		} catch (e) {
			console.error(e)
		}
	}

	protected setupState(): void {
		if (this.isInitialized) return
		const playerPosition =
			useGameStore.getState().currentZone?.startingPosition ||
			DEFAULT_STARTING_POSITION
		useGameStore.setState({ playerPosition })
	}

	protected registerCommandHandlers(): void {
		// No static commands mapped here; input handlers are dynamic.
	}

	protected override onInitialized(): void {
		this.startGame()
	}

	public startGame(): void {
		const store = useGameStore.getState()
		store.setScreen('INTRO')
	}

	public async startNewGame(): Promise<void> {
		const createdCharacters =
			useCharacterCreationStore.getState().createdCharacters
		const activeIds = Array.from(useGameStore.getState().party.map((p) => p.id))
		const newSave: SaveGameDocument = {
			metadata: {
				id: generateSaveGameId(),
				name: 'New Game',
				createdAt: Date.now(),
				updatedAt: Date.now(),
				playtimeSeconds: 0,
			},
			worldState: {
				currentZoneId: 'starter_town',
				playerPosition: { x: 3, y: 3 },
				flags: {
					is_new_game: true,
					intro_complete: true,
				},
			},
			activePartyMemberIds: activeIds,
			characterPool: [...createdCharacters],
		}
		useGameStore.getState().resetRuntime()
		SaveGameService.saveGame(newSave)
		useGameStore.getState().setSavedGame(newSave)
		await this.triggerCutScene('starter_town', 'intro')
	}

	public enterCharacterCreationMode(): void {
		this.unbindWorldInput?.()
		useGameStore.getState().setScreen('CHARACTER_CREATION')
	}

	public enterCharacterSheetMode(
		id: string,
		context: CharacterSheetContext,
	): void {
		this.unbindWorldInput?.()
		useGameStore.getState().setInspectedCharacter(id, context)
		useGameStore.getState().setScreen('CHARACTER_SHEET')
	}

	public enterPartyRosterMode(): void {
		this.unbindWorldInput?.()
		useGameStore.getState().setScreen('PARTY_ROSTER')
	}

	public enterWorldMode(): void {
		const store = useGameStore.getState()
		store.setScreen('WORLD_MAP')

		combatEngine.cleanup()
		this.unbindWorldInput?.()

		this.unbindWorldInput = inputManager.registerHandler((key) => {
			if (useGameStore.getState().currentScreen !== 'WORLD_MAP') return false

			switch (key) {
				case 'ArrowUp':
				case 'w':
					this.movePlayer(0, -1)
					return true
				case 'ArrowDown':
				case 's':
					this.movePlayer(0, 1)
					return true
				case 'ArrowLeft':
				case 'a':
					this.movePlayer(-1, 0)
					return true
				case 'ArrowRight':
				case 'd':
					this.movePlayer(1, 0)
					return true
				case 'e':
				case 'E':
					void this.enterPortal()
					return true
				case 'o':
				case 'O':
					// Open: asks for a direction ([Game 18]).
					if (!useGameStore.getState().currentZone) return false
					useGameStore.getState().setOpenPrompt({ step: 'direction' })
					return true
				case 'c':
				case 'C': {
					// First party member by order; cycling members comes later.
					const [first] = [...useGameStore.getState().party].sort(
						(a, b) => a.order - b.order,
					)
					if (!first) return false
					this.enterCharacterSheetMode(first.id, 'WORLD')
					return true
				}
				default:
					return false
			}
		})
	}

	public addCharacterToParty(id: string): void {
		const character = useCharacterCreationStore.getState().findCharacterById(id)
		if (!character) return
		const store = useGameStore.getState()
		const party = store.party
		if (party.find((p) => p.id === id)) return
		store.setParty([...party, character])
	}

	public async loadRegion(regionId: string): Promise<void> {
		useGameStore.setState({ isMapLoading: true })
		try {
			const [zone, dialogs] = await Promise.all([
				zoneLoaderService.loadByDisplayId(regionToZoneId(regionId)),
				dialogService.getDialogByRegionId(regionId),
			])
			useGameStore.getState().setCurrentZone(zone)
			useDialogStore.getState().setDialogs(dialogs)
		} catch (e) {
			console.error(e)
			throw e
		} finally {
			useGameStore.setState({ isMapLoading: false })
		}
	}

	/** The game state the interaction engine reads and changes, read fresh each call. */
	private interactionHost(): InteractionHost {
		const get = () => useGameStore.getState()
		return {
			log: (message) => get().addLog(message),
			getFlag: (flag) => get().flags[flag],
			setFlag: (flag) => get().setFlag(flag),
			getRuns: (key) => get().interactionRuns[key] ?? 0,
			recordRun: (key) => get().recordRun(key),
			getPlacements: () => get().runtimePlacements,
			setPlacements: (placements) => get().setRuntimePlacements(placements),
			getParty: () => get().party,
			setParty: (party) => get().setParty(party),
			openGivePool: (pos, items) => get().setGivePool({ pos, items }),
		}
	}

	/**
	 * The open command, step two ([Game 18]): looks at the cell one step in a
	 * direction. Nothing that opens is a message; something that needs a
	 * HAS_ITEM check asks for a character first; anything else just runs.
	 */
	public openToward(dx: number, dy: number): void {
		const store = useGameStore.getState()
		const target = {
			x: store.playerPosition.x + dx,
			y: store.playerPosition.y + dy,
		}
		const defs = useContentStore.getState()
		const host = this.interactionHost()
		const need = this.interactiveEngine.requirementFor(
			'OPEN',
			target,
			defs,
			host,
		)
		if (need === 'character') {
			store.setOpenPrompt({ step: 'character', pos: target })
			return
		}
		store.setOpenPrompt(null)
		if (need === 'none') {
			store.addLog('> There is nothing to open there.')
			return
		}
		this.interactiveEngine.trigger('OPEN', target, defs, host)
	}

	/** The open command, step three: the chosen party member (1-based, by order) opens the cell. */
	public openWith(pos: Position, partyNumber: number): void {
		const store = useGameStore.getState()
		const member = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		if (!member) return
		store.setOpenPrompt(null)
		this.interactiveEngine.trigger(
			'OPEN',
			pos,
			useContentStore.getState(),
			this.interactionHost(),
			member,
		)
	}

	/**
	 * Gives the whole pile on line `index` of the give pool to the party member
	 * in position `partyNumber` (1-based, by order), after the weight check
	 * ([Game 17]). The pool closes by itself when it is empty.
	 */
	public giveFromPool(
		index: number,
		partyNumber: number,
	): 'given' | 'too_heavy' | 'invalid' {
		const store = useGameStore.getState()
		const pool = store.givePool
		const line = pool?.items[index]
		const member = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		const items = useContentStore.getState().items
		const def = line ? items.get(line.itemId) : undefined
		if (!pool || !line || !member || !def) return 'invalid'

		if (!fitsInInventory(member, def, line.quantity, items)) return 'too_heavy'

		store.setParty(
			store.party.map((c) =>
				c.id === member.id
					? addToInventory(c, line.itemId, def, line.quantity)
					: c,
			),
		)
		store.addLog(
			`> ${member.name} takes ${def.name}${line.quantity > 1 ? ` x${line.quantity}` : ''}.`,
		)
		const rest = pool.items.filter((_, i) => i !== index)
		store.setGivePool(rest.length > 0 ? { ...pool, items: rest } : null)
		return 'given'
	}

	/**
	 * Moves a whole inventory entry from one party member to the one in
	 * position `partyNumber` (1-based, by order), after the weight check on the
	 * receiver. Stackables merge into the receiver's piles ([Inventory 21]).
	 */
	public tradeItem(
		fromId: string,
		uid: string,
		partyNumber: number,
	): 'traded' | 'too_heavy' | 'invalid' {
		const store = useGameStore.getState()
		const to = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		const from = store.party.find((c) => c.id === fromId)
		const entry = from?.inventory?.find((e) => e.uid === uid)
		const items = useContentStore.getState().items
		const def = entry ? items.get(entry.itemId) : undefined
		if (!from || !to || !entry || !def || from.id === to.id) return 'invalid'

		const quantity = entry.quantity ?? 1
		if (!fitsInInventory(to, def, quantity, items)) return 'too_heavy'

		store.setParty(
			store.party.map((c) => {
				if (c.id === from.id) return removeFromInventory(c, uid)
				if (c.id === to.id)
					return addToInventory(c, entry.itemId, def, quantity)
				return c
			}),
		)
		store.addLog(
			`> ${from.name} gives ${def.name}${quantity > 1 ? ` x${quantity}` : ''} to ${to.name}.`,
		)
		return 'traded'
	}

	/**
	 * Leaves the give menu. What was not handed out goes on top of the cell's
	 * stack, in the order it was listed ([Game 17]).
	 */
	public closeGivePool(): void {
		const store = useGameStore.getState()
		const pool = store.givePool
		if (!pool) return
		const items = useContentStore.getState().items
		let placements = store.runtimePlacements
		for (const line of pool.items) {
			const def = items.get(line.itemId)
			if (!def) continue
			// Only a def that stacks keeps a quantity; the rest is one each.
			const piles = def.maxQuantity === undefined ? line.quantity : 1
			for (let i = 0; i < piles; i++) {
				placements = addPlacement(placements, pool.pos, {
					uid: crypto.randomUUID(),
					defKind: def.kind,
					defId: line.itemId,
					...(def.maxQuantity !== undefined && { quantity: line.quantity }),
				})
			}
		}
		store.setRuntimePlacements(placements)
		store.setGivePool(null)
	}

	/**
	 * Takes the portal under the player to its destination (DATA-MODEL 1.3):
	 * entering is an explicit key press, not a step. A portal with no
	 * destination is simply unconnected.
	 */
	private async enterPortal(): Promise<void> {
		const store = useGameStore.getState()
		if (!store.currentZone || store.isMapLoading) return

		const portal = findPortalAt(store.runtimePlacements, store.playerPosition)
		if (!portal) {
			store.addLog('> There is nothing to enter here.')
			return
		}
		const { destination } = portal
		if (!destination) {
			store.addLog('> This leads nowhere yet.')
			return
		}

		// `{ back: true }` returns to where the last portal was entered from.
		let target: { zoneId: string; pos?: Position }
		const isBack = 'back' in destination
		if (isBack) {
			const entry = store.entryStack.at(-1)
			if (!entry) {
				store.addLog('> This leads nowhere yet.')
				return
			}
			target = entry
		} else {
			target = destination
		}
		const leftFrom = {
			zoneId: store.currentZone._id,
			pos: store.playerPosition,
		}

		useGameStore.setState({ isMapLoading: true })
		try {
			const zone = await zoneLoaderService.loadById(target.zoneId)
			const game = useGameStore.getState()
			if (isBack) game.popEntry()
			else game.pushEntry(leftFrom)
			game.setCurrentZone(zone)
			game.setPlayerPosition(
				target.pos ?? zone.startingPosition ?? DEFAULT_STARTING_POSITION,
			)
			game.addLog(`> You ${isBack ? 'return to' : 'enter'} ${zone.name}.`)
		} catch (e) {
			console.error(e)
			useGameStore.getState().addLog('> The way is blocked.')
		} finally {
			useGameStore.setState({ isMapLoading: false })
		}
	}

	private movePlayer(dx: number, dy: number): void {
		const store = useGameStore.getState()
		if (!store.currentZone || store.isMapLoading) return

		const nextX = store.playerPosition.x + dx
		const nextY = store.playerPosition.y + dy
		console.log(`trying to move to ${nextX}, ${nextY}`)

		const res = this.interactiveEngine.evaluateMove(
			store.playerPosition,
			dx,
			dy,
			store.currentZone,
			store.runtimePlacements,
			useContentStore.getState(),
		)
		const target = { x: nextX, y: nextY }
		const defs = useContentStore.getState()
		if (!res.canMove) {
			// Bumping a solid thing runs its BUMP_INTERACT; with none, say why.
			const handled = this.interactiveEngine.trigger(
				'BUMP_INTERACT',
				target,
				defs,
				this.interactionHost(),
			)
			if (!handled && res.blockReason) store.addLog(`> ${res.blockReason}`)
			return
		}
		store.setPlayerPosition(res.nextPos)

		if (res.targetTile) {
			store.addLog(
				`> Moved to ${res.targetTile.name} (${res.nextPos.x}, ${res.nextPos.y}).`,
			)
		}
		this.interactiveEngine.trigger('WALK', target, defs, this.interactionHost())

		const portal = findPortalAt(
			useGameStore.getState().runtimePlacements,
			target,
		)
		if (portal) {
			const name = lookupPlacementDef(defs, portal)?.name ?? 'portal'
			store.addLog(`> Press E to enter the ${name}.`)
		}

		if (
			EncounterService.shouldTriggerEncounter(
				res.targetTile as TileDef,
				store.currentZone,
			)
		) {
			const encounter = combatEngine.generateEncounter(
				store.currentZone,
				res.targetTile as TileDef,
			)
			this.unbindWorldInput?.()
			store.setEncounter(encounter)
			combatEngine.enterCombat(() => this.enterWorldMode())
		}
	}

	public removeCharacterFromParty(id: string): void {
		const store = useGameStore.getState()
		const party = store.party
		const character = party.find((p) => p.id === id)
		if (!character) return
		store.setParty(party.filter((p) => p.id !== id))
	}

	public async triggerCutScene(regionId: string, key: string): Promise<void> {
		try {
			await this.loadRegion(regionId)
			const seq = useDialogStore.getState().getSequence(key)
			if (!seq) {
				console.error(`Dialog key "${key}" not found!`)
				return
			}
			useDialogStore.getState().setActiveSequence(seq)
			useGameStore.getState().setScreen('CUT_SCENE')
		} catch (e) {
			console.error(e)
		}
	}

	protected update(_deltaTime: number): void {
		this.gameTime += _deltaTime
	}

	public override shutdown(): void {
		super.shutdown()
		this.unbindWorldInput?.()
		combatEngine.cleanup()
		inputManager.detachListeners()
	}
}

let instance: GameEngine | null = null
export const getGameEngine = (): GameEngine => {
	if (!instance) instance = new GameEngine()
	return instance
}
