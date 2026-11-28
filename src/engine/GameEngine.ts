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
import type { Currency, Qualifiers, TileDef } from '@shared/types'
import {
	addCurrency,
	addPlacement,
	addToInventory,
	cellKey,
	completeQualifiers,
	encounterChance,
	equip,
	findPortalAt,
	fitsInInventory,
	gatherCurrency,
	generateSaveGameId,
	heldCurrencies,
	itemRun,
	lookupPlacementDef,
	qualifiedName,
	receiveItem,
	removeFromInventory,
	removePlacement,
	slotOf,
	unequip,
} from '@/utils'

// TODO [Game 7]: regions (dialog files) and zones are keyed differently until
// portals and saves carry a zone `_id`. Bridge: region id -> the zone's `id`.
const REGION_ZONE_IDS: Record<string, string> = {
	starter_town: 'STARTING_TOWN',
}
/** An entry's full name for the log, or "an item" when its def is missing. */
const entryName = (
	name: string | undefined,
	qualifiers?: Qualifiers,
): string => (name ? qualifiedName(name, qualifiers) : 'an item')

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
			const [, startingZone] = await Promise.all([
				useContentStore.getState().loadDefs(),
				zoneLoaderService.loadByDisplayId(regionToZoneId('starter_town')),
			])
			useCharacterCreationStore.setState({
				createdCharacters: characters,
			})
			useGameStore.getState().setCurrentZone(startingZone)
			useGameStore.setState({ isMapLoading: false })
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
				case 'g':
				case 'G':
					// Get: asks for a direction, Space for the player's own cell.
					// Capital G gets every item on top of the stack ([Inventory 50]).
					if (!useGameStore.getState().currentZone) return false
					useGameStore
						.getState()
						.setGetPrompt({ step: 'direction', all: key === 'G' })
					return true
				case 't':
				case 'T':
					// Talk: asks for a direction, Space for the player's own cell
					// ([Game 25]).
					if (!useGameStore.getState().currentZone) return false
					useGameStore.getState().setTalkPrompt({ step: 'direction' })
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
			getDifficulty: () => zoneLoaderService.configFor(get().currentZone),
			rollRandomEncounter: () => {
				const zone = get().currentZone
				if (!zone || !zone.randomEncounters || zone.randomEncounters === 'none')
					return false
				const config = zoneLoaderService.difficultyConfig(zone)
				if (Math.random() < encounterChance('config', undefined, config)) {
					const encounter = combatEngine.generateEncounter(
						zone,
						undefined,
						'config',
					)
					if (encounter) {
						this.unbindWorldInput?.()
						get().setEncounter(encounter)
						combatEngine.enterCombat(() => this.enterWorldMode())
					}
				}
				return true
			},
			startEncounter: (groups, barrier) => {
				const zone = get().currentZone
				const encounter = zone && combatEngine.buildSetEncounter(zone, groups)
				if (!encounter) return
				this.unbindWorldInput?.()
				get().setEncounter(encounter)
				combatEngine.enterCombat((outcome) => {
					// Winning clears the barrier. Fleeing rolls the highest
					// `removalChance` of its groups ([Combat 5]): on a success the
					// barrier leaves, otherwise it stays for another try.
					const g = useGameStore.getState()
					const monsters = useContentStore.getState().monsters
					const chance = Math.max(
						0,
						...groups.map((grp) => monsters.get(grp.defId)?.removalChance ?? 0),
					)
					const leaves = outcome === 'fled' && Math.random() * 100 < chance
					if (outcome === 'won' || leaves) {
						g.setRuntimePlacements(
							removePlacement(g.runtimePlacements, barrier.pos, barrier.uid),
						)
					}
					if (leaves) g.addLog('> The monsters give up and wander off.')
					this.enterWorldMode()
				})
			},
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
	 * The talk command, step two ([Game 25]): looks at the cell one step in a
	 * direction (`0, 0` is the player's own cell). Only an object with a TALK
	 * interaction answers; anything else is a joke. No character is chosen, so
	 * HAS_ITEM and TAKE_ITEM search the whole party.
	 */
	public talkToward(dx: number, dy: number): void {
		const store = useGameStore.getState()
		store.setTalkPrompt(null)
		const target = {
			x: store.playerPosition.x + dx,
			y: store.playerPosition.y + dy,
		}
		const stack = store.runtimePlacements[cellKey(target.x, target.y)]
		const top = stack?.[stack.length - 1]
		const defs = useContentStore.getState()
		const host = this.interactionHost()
		if (
			top?.defKind !== 'object' ||
			this.interactiveEngine.requirementFor('TALK', target, defs, host) ===
				'none'
		) {
			store.addLog('> Who are you trying to talk to?')
			return
		}
		this.interactiveEngine.trigger('TALK', target, defs, host)
	}

	/**
	 * The item the get command would take from a cell: the top placement, if it
	 * is an item, weapon or armor. Anything buried under an object stays put.
	 */
	private itemOnTop(pos: Position) {
		const stack =
			useGameStore.getState().runtimePlacements[cellKey(pos.x, pos.y)]
		const top = stack?.[stack.length - 1]
		if (!top || !['item', 'weapon', 'armor'].includes(top.defKind)) return
		const def = useContentStore.getState().items.get(top.defId)
		return def ? { placement: top, def } : undefined
	}

	/**
	 * The get command, step two ([Game ?]): looks at the cell one step in a
	 * direction (`0, 0` is the player's own cell). An item on top asks for a
	 * character; anything else is "Nothing there!".
	 */
	public getToward(dx: number, dy: number): void {
		const store = useGameStore.getState()
		const target = {
			x: store.playerPosition.x + dx,
			y: store.playerPosition.y + dy,
		}
		const found = this.itemOnTop(target)
		if (!found) {
			store.setGetPrompt(null)
			store.addLog('> Nothing there!')
			return
		}
		const all = store.getPrompt?.all
		// An inventory entry can't hold contents yet, so a loaded container
		// would lose them. Taking one is its own feature. Get all passes over it.
		if (!all && found.placement.contents?.length) {
			store.setGetPrompt(null)
			store.addLog(`> ${found.def.name} is too full to pick up yet.`)
			return
		}
		store.setGetPrompt({ step: 'character', pos: target, all })
	}

	/**
	 * The get command, step three: the chosen party member (1-based, by order)
	 * takes the whole pile if it fits. Too heavy keeps the prompt open so
	 * another character can try; anything else closes it.
	 */
	public getWith(pos: Position, partyNumber: number): void {
		const store = useGameStore.getState()
		if (store.getPrompt?.all) {
			this.getAllWith(pos, partyNumber)
			return
		}
		const member = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		const found = this.itemOnTop(pos)
		if (!member || !found) {
			store.setGetPrompt(null)
			return
		}
		const { placement, def } = found
		const quantity = placement.quantity ?? 1
		const items = useContentStore.getState().items
		// A set qualifier is kept; a missing one is rolled now, once ([Game 24]).
		const qualifiers = completeQualifiers(
			def,
			placement.qualifiers,
			zoneLoaderService.configFor(store.currentZone),
		)
		const received = receiveItem(
			member,
			placement.defId,
			def,
			quantity,
			items,
			qualifiers,
		)
		if (!received) {
			store.addLog('> Too heavy!')
			return
		}
		store.setParty(store.party.map((c) => (c.id === member.id ? received : c)))
		store.setRuntimePlacements(
			removePlacement(store.runtimePlacements, pos, placement.uid),
		)
		store.setGetPrompt(null)
		store.addLog(
			`> ${member.name} takes ${qualifiedName(def.name, qualifiers)}${quantity > 1 ? ` x${quantity}` : ''}.`,
		)
	}

	/**
	 * Get all, step three ([Inventory 50]): the chosen party member takes, top
	 * first, every item on top of the stack that they can carry. What is too
	 * heavy stays, and lighter items below it are still taken. If they can take
	 * none for weight, the prompt stays open for another character.
	 */
	private getAllWith(pos: Position, partyNumber: number): void {
		const store = useGameStore.getState()
		let member = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		if (!member) {
			store.setGetPrompt(null)
			return
		}
		const items = useContentStore.getState().items
		const config = zoneLoaderService.configFor(store.currentZone)
		let placements = store.runtimePlacements
		const taken: string[] = []
		const tooHeavy: string[] = []
		const tooFull: string[] = []
		for (const placement of itemRun(placements[cellKey(pos.x, pos.y)] ?? [])) {
			const def = items.get(placement.defId)
			if (!def) continue
			if (placement.contents?.length) {
				tooFull.push(def.name)
				continue
			}
			const quantity = placement.quantity ?? 1
			const qualifiers = completeQualifiers(def, placement.qualifiers, config)
			const received = receiveItem(
				member,
				placement.defId,
				def,
				quantity,
				items,
				qualifiers,
			)
			if (!received) {
				tooHeavy.push(def.name)
				continue
			}
			member = received
			placements = removePlacement(placements, pos, placement.uid)
			taken.push(
				`${qualifiedName(def.name, qualifiers)}${quantity > 1 ? ` x${quantity}` : ''}`,
			)
		}
		if (taken.length === 0 && tooHeavy.length > 0) {
			store.addLog('> Too heavy!')
			return
		}
		const receiver = member
		store.setParty(
			store.party.map((c) => (c.id === receiver.id ? receiver : c)),
		)
		store.setRuntimePlacements(placements)
		store.setGetPrompt(null)
		if (taken.length > 0) {
			store.addLog(`> ${receiver.name} takes ${taken.join(', ')}.`)
		}
		if (tooHeavy.length > 0) {
			store.addLog(`> Too heavy for ${receiver.name}: ${tooHeavy.join(', ')}.`)
		}
		for (const name of tooFull) {
			store.addLog(`> ${name} is too full to pick up yet.`)
		}
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

		const received = receiveItem(
			member,
			line.itemId,
			def,
			line.quantity,
			items,
			line.qualifiers,
		)
		if (!received) return 'too_heavy'

		store.setParty(store.party.map((c) => (c.id === member.id ? received : c)))
		store.addLog(
			`> ${member.name} takes ${qualifiedName(def.name, line.qualifiers)}${line.quantity > 1 ? ` x${line.quantity}` : ''}.`,
		)
		const rest = pool.items.filter((_, i) => i !== index)
		store.setGivePool(rest.length > 0 ? { ...pool, items: rest } : null)
		return 'given'
	}

	/**
	 * Take all ([Inventory 52]): the party member in position `partyNumber`
	 * takes, in order, every line of the give pool that they can carry. What is
	 * too heavy stays in the menu, and lighter lines after it are still taken.
	 * Returns how many lines were taken and the names of the ones left, or null
	 * when there is nothing to do.
	 */
	public giveAllFromPool(
		partyNumber: number,
	): { taken: number; tooHeavy: string[] } | null {
		const store = useGameStore.getState()
		const pool = store.givePool
		let member = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		if (!pool || !member) return null
		const items = useContentStore.getState().items
		const taken: string[] = []
		const rest: typeof pool.items = []
		const tooHeavy: string[] = []
		for (const line of pool.items) {
			const def = items.get(line.itemId)
			if (!def) {
				rest.push(line)
				continue
			}
			const name = qualifiedName(def.name, line.qualifiers)
			const received = receiveItem(
				member,
				line.itemId,
				def,
				line.quantity,
				items,
				line.qualifiers,
			)
			if (!received) {
				rest.push(line)
				tooHeavy.push(name)
				continue
			}
			member = received
			taken.push(`${name}${line.quantity > 1 ? ` x${line.quantity}` : ''}`)
		}
		const receiver = member
		if (taken.length > 0) {
			store.setParty(
				store.party.map((c) => (c.id === receiver.id ? receiver : c)),
			)
			store.addLog(`> ${receiver.name} takes ${taken.join(', ')}.`)
			store.setGivePool(rest.length > 0 ? { ...pool, items: rest } : null)
		}
		if (tooHeavy.length > 0) {
			store.addLog(`> Too heavy for ${receiver.name}: ${tooHeavy.join(', ')}.`)
		}
		return { taken: taken.length, tooHeavy }
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
	): 'traded' | 'too_heavy' | 'equipped' | 'invalid' {
		const store = useGameStore.getState()
		const to = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		const from = store.party.find((c) => c.id === fromId)
		const entry = from?.inventory?.find((e) => e.uid === uid)
		const items = useContentStore.getState().items
		const def = entry ? items.get(entry.itemId) : undefined
		if (!from || !to || !entry || !def || from.id === to.id) return 'invalid'

		// An equipped piece has to be unequipped first.
		if (slotOf(from, uid)) return 'equipped'

		const quantity = entry.quantity ?? 1
		if (!fitsInInventory(to, def, quantity, items)) return 'too_heavy'

		store.setParty(
			store.party.map((c) => {
				if (c.id === from.id) return removeFromInventory(c, uid)
				if (c.id === to.id)
					return addToInventory(
						c,
						entry.itemId,
						def,
						quantity,
						entry.qualifiers,
					)
				return c
			}),
		)
		store.addLog(
			`> ${from.name} gives ${qualifiedName(def.name, entry.qualifiers)}${quantity > 1 ? ` x${quantity}` : ''} to ${to.name}.`,
		)
		return 'traded'
	}

	/**
	 * Moves an amount of one currency from a party member to the one in
	 * position `partyNumber` (1-based, by order) ([Currency 11]). False when
	 * the amount isn't 1 up to what the giver holds.
	 */
	public giveCurrency(
		fromId: string,
		partyNumber: number,
		currency: Currency,
		amount: number,
	): boolean {
		const store = useGameStore.getState()
		const to = [...store.party].sort((a, b) => a.order - b.order)[
			partyNumber - 1
		]
		const from = store.party.find((c) => c.id === fromId)
		if (!from || !to || from.id === to.id) return false
		const held = from.currency?.[currency] ?? 0
		if (!Number.isInteger(amount) || amount < 1 || amount > held) return false

		store.setParty(
			store.party.map((c) => {
				if (c.id === from.id) return addCurrency(c, currency, -amount)
				if (c.id === to.id) return addCurrency(c, currency, amount)
				return c
			}),
		)
		store.addLog(`> ${from.name} gives ${amount} ${currency} to ${to.name}.`)
		return true
	}

	/**
	 * Gathers the whole party's currency onto one member ([Currency 11]).
	 * False when no one else holds any.
	 */
	public poolCurrency(characterId: string): boolean {
		const store = useGameStore.getState()
		const character = store.party.find((c) => c.id === characterId)
		const others = store.party.filter((c) => c.id !== characterId)
		if (!character || !others.some((c) => heldCurrencies(c).length > 0)) {
			return false
		}
		store.setParty(gatherCurrency(store.party, characterId))
		store.addLog(`> ${character.name} gathers the party's currency.`)
		return true
	}

	/**
	 * Can this entry be dropped? A quest item never can ([Inventory 22]); the
	 * check reads the def's flag, as [Inventory 18] leans.
	 */
	public canDrop(
		characterId: string,
		uid: string,
	): 'ok' | 'quest_item' | 'invalid' {
		const entry = useGameStore
			.getState()
			.party.find((c) => c.id === characterId)
			?.inventory?.find((e) => e.uid === uid)
		const def = entry
			? useContentStore.getState().items.get(entry.itemId)
			: undefined
		if (!entry || !def) return 'invalid'
		return def.isQuestItem ? 'quest_item' : 'ok'
	}

	/** Removes a whole entry from the game (it does not land on the map). */
	public dropItem(
		characterId: string,
		uid: string,
	): 'dropped' | 'quest_item' | 'invalid' {
		const check = this.canDrop(characterId, uid)
		if (check !== 'ok') return check
		const store = useGameStore.getState()
		const character = store.party.find((c) => c.id === characterId)
		const entry = character?.inventory?.find((e) => e.uid === uid)
		if (!character || !entry) return 'invalid'
		const def = useContentStore.getState().items.get(entry.itemId)

		store.setParty(
			store.party.map((c) =>
				c.id === characterId ? removeFromInventory(c, uid) : c,
			),
		)
		store.addLog(
			`> ${character.name} drops ${def ? qualifiedName(def.name, entry.qualifiers) : 'an item'}${entry.quantity && entry.quantity > 1 ? ` x${entry.quantity}` : ''}.`,
		)
		return 'dropped'
	}

	/**
	 * Equips a weapon or armor entry ([Inventory 40], [Inventory 41]). Returns
	 * why it can't be, or null when it was.
	 */
	public equipItem(characterId: string, uid: string): string | null {
		const store = useGameStore.getState()
		const character = store.party.find((c) => c.id === characterId)
		if (!character) return 'No such character.'
		const items = useContentStore.getState().items
		const result = equip(character, uid, items)
		if ('problem' in result) return result.problem
		store.setParty(
			store.party.map((c) => (c.id === characterId ? result.character : c)),
		)
		const entry = character.inventory?.find((e) => e.uid === uid)
		store.addLog(
			`> ${character.name} equips ${entryName(items.get(entry?.itemId ?? '')?.name, entry?.qualifiers)}.`,
		)
		return null
	}

	/** Takes a piece off. No checks; an entry that isn't equipped does nothing. */
	public unequipItem(characterId: string, uid: string): boolean {
		const store = useGameStore.getState()
		const character = store.party.find((c) => c.id === characterId)
		if (!character || !slotOf(character, uid)) return false
		const entry = character.inventory?.find((e) => e.uid === uid)
		store.setParty(
			store.party.map((c) => (c.id === characterId ? unequip(c, uid) : c)),
		)
		store.addLog(
			`> ${character.name} takes off ${entryName(useContentStore.getState().items.get(entry?.itemId ?? '')?.name, entry?.qualifiers)}.`,
		)
		return true
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
					...(line.qualifiers && { qualifiers: line.qualifiers }),
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
			if (encounter) {
				this.unbindWorldInput?.()
				store.setEncounter(encounter)
				combatEngine.enterCombat(() => this.enterWorldMode())
			}
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
