import { DEFAULT_STARTING_POSITION } from '@/constants'
import {
	BaseGameEngine,
	combatEngine,
	getInteractionEngine,
	inputManager,
	InteractionEngine,
} from '@/engine'
import {
	CharacterStorageService,
	dialogService,
	EncounterService,
	mapLoaderService,
	SaveGameService,
	tileTypeLoaderService,
} from '@/services'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useDialogStore } from '@/store/useDialogStore'
import { useGameStore } from '@/store/useGameStore'
import type { CharacterSheetContext, SaveGameDocument, TileDef } from '@/types'
import { generateSaveGameId } from '@/utils'

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
			const [startingZone, monsters, tileObjects] = await Promise.all([
				mapLoaderService.loadZone('starter_town'),
				EncounterService.fetchMonsters(),
				tileTypeLoaderService.load(),
			])
			useCharacterCreationStore.setState({
				createdCharacters: characters,
			})
			useGameStore.setState({
				currentZone: startingZone,
				isMapLoading: false,
				monsters,
				tileObjects,
			})
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
				mapLoaderService.loadZone(regionId),
				dialogService.getDialogByRegionId(regionId),
			])
			useGameStore.setState({ currentZone: zone })
			useDialogStore.getState().setDialogs(dialogs)
		} catch (e) {
			console.error(e)
			throw e
		} finally {
			useGameStore.setState({ isMapLoading: false })
		}
	}

	private movePlayer(dx: number, dy: number): void {
		const store = useGameStore.getState()
		if (!store.currentZone) return

		const nextX = store.playerPosition.x + dx
		const nextY = store.playerPosition.y + dy
		console.log(`trying to move to ${nextX}, ${nextY}`)

		const res = this.interactiveEngine.evaluateMove(
			store.playerPosition,
			dx,
			dy,
			store.tileObjects,
			store.currentZone,
		)
		// check if there is an event
		if (
			!res.canMove &&
			this.interactiveEngine.hasTileEvents(nextX, nextY, store.currentZone)
		) {
			this.interactiveEngine.evaluateTile(nextX, nextY, store.currentZone)
			return
		} else if (!res.canMove && res.blockReason) {
			store.addLog(`> ${res.blockReason}`)
			return
		} else {
			if (
				this.interactiveEngine.hasTileEvents(nextX, nextY, store.currentZone)
			) {
				this.interactiveEngine.evaluateTile(nextX, nextY, store.currentZone)
			}
			store.setPlayerPosition(res.nextPos)
		}

		if (res.targetTile) {
			store.addLog(
				`> Moved to ${res.targetTile.name} (${res.nextPos.x}, ${res.nextPos.y}).`,
			)
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
