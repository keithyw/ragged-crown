import { BaseGameEngine, CommandBus, InputManager } from '@/engine'
import { mapLoaderService, EncounterService, PartyService } from '@/services'
import { useGameStore } from '@/store/useGameStore'
import type { CombatActionType, Command, GameScreen, TileDef } from '@/types'
import { evaluateMove } from '@/utils'

export class GameEngine extends BaseGameEngine {
	public commandBus: CommandBus
	public inputManager!: InputManager
	public gameTime: number
	private isInitialized = false

	constructor() {
		super()
		this.commandBus = new CommandBus()
		this.gameTime = 0
	}

	public override async initialize(): Promise<void> {
		if (this.isInitialized) return
		if (!this.inputManager) {
			this.inputManager = new InputManager(this.commandBus)
		}
		await super.initialize()
		this.isInitialized = true
	}

	/** Template Method Step 1: Load essential initial assets */
	protected async loadAssets(): Promise<void> {
		if (this.isInitialized || useGameStore.getState().isMapLoading) return
		useGameStore.setState({ isMapLoading: true })

		// Load default starting zone map asset
		try {
			const [startingZone, monsters, party] = await Promise.all([
				mapLoaderService.loadZone('a1'),
				EncounterService.fetchMonsters(),
				PartyService.fetchParty(),
			])
			useGameStore.setState({
				currentZone: startingZone,
				isMapLoading: false,
				monsters,
				party,
			})
		} catch (e) {
			console.error(e)
			useGameStore.getState().addLog('> Failed to load assets.')
		}
	}

	/** Template Method Step 2: Hydrate initial store state */
	protected setupState(): void {
		if (this.isInitialized) return
		useGameStore.setState({
			playerPosition: { x: 5, y: 5 },
		})
		useGameStore
			.getState()
			.addLog('> Game initialized. Welcome to Crag Valley.')
	}

	/** Template Method Step 3: Map command types on CommandBus to store actions */
	protected registerCommandHandlers(): void {
		this.commandBus.clear()
		// Handle Movement
		this.commandBus.subscribe('MOVE_PLAYER', (cmd: Command) => {
			this.movePlayer(cmd.payload as { dx: number; dy: number })
		})

		// Handle Interactions
		this.commandBus.subscribe('INTERACT', () => {
			useGameStore.getState().addLog('> You interact with the surroundings.')
		})

		this.commandBus.subscribe('COMBAT_FLEE', () => {
			this.fleeCombat()
		})

		this.commandBus.subscribe('COMBAT_START', () => {
			this.startCombat()
		})

		this.commandBus.subscribe('COMBAT_ATTACK', () => {
			this.handleCharacterAction('ATTACK')
		})

		this.commandBus.subscribe('COMBAT_DEFEND', () => {
			this.handleCharacterAction('DEFEND')
		})

		this.commandBus.subscribe('COMBAT_CAST_SPELL', () => {
			this.handleCharacterAction('CAST_SPELL')
		})
	}

	/** Template Method Step 4: Called once initialization completes */
	protected override onInitialized(): void {
		this.inputManager.attachListeners()
		this.setScreenContext('WORLD_MAP')
	}

	/** Change screen mode and swap keyboard controls instantly */
	public setScreenContext(context: GameScreen): void {
		this.inputManager.setContext(context)
		useGameStore.getState().setScreen(context)
	}

	/** Core Game Loop Update (executed on animation frames) */
	protected update(deltaTime: number): void {
		this.gameTime += deltaTime
	}

	/** Cleanup when shutting down or unmounting */
	public override shutdown(): void {
		super.shutdown()
		if (this.inputManager) {
			this.inputManager.detachListeners()
		}
		this.commandBus.clear()
	}

	public fleeCombat(): void {
		const store = useGameStore.getState()
		store.setEncounter(null)
		this.setScreenContext('WORLD_MAP')
		store.addLog(`> You flee the battle!`)
	}

	public startCombat(): void {
		this.setScreenContext('COMBAT_PLANNING')
		const store = useGameStore.getState()
		store.setCombatPhase('PLANNING')
		store.setActiveCharacter(0)
		store.addLog('> Fight chosen! (Planning Phase coming soon...)')
	}

	// Helper methods in GameEngine.ts
	public handleCharacterAction(
		actionType: CombatActionType,
		targetGroupIndex: number = 0,
	): void {
		const store = useGameStore.getState()
		if (store.combatPhase !== 'PLANNING' || !store.party) return

		const currentChar = store.party[store.activeCharacter]
		if (!currentChar) return

		// 1. Queue Action
		store.queueAction({
			actorId: currentChar.id,
			actorType: 'PARTY',
			actionType,
			target: {
				type: 'MONSTER_GROUP',
				id: String(targetGroupIndex),
			},
		})

		store.addLog(`> ${currentChar.name} queued: ${actionType}`)

		// 2. Advance to next character or finish planning
		const nextIndex = store.activeCharacter + 1

		if (nextIndex < store.party.length) {
			store.setActiveCharacter(nextIndex)
		} else {
			store.setCombatPhase('CONFIRMATION')
			store.addLog('> All character actions assigned. Confirm round?')
		}
	}

	private movePlayer({ dx, dy }: { dx: number; dy: number }): void {
		const store = useGameStore.getState()
		if (store.currentScreen !== 'WORLD_MAP' || !store.currentZone) return
		const res = evaluateMove(store.playerPosition, dx, dy, store.currentZone)
		if (!res.canMove) {
			if (res.blockReason) {
				store.addLog(`> ${res.blockReason}`)
			}
			return
		}

		store.setPlayerPosition(res.nextPos)

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
			const encounter = EncounterService.generateEncounter(
				store.currentZone,
				res.targetTile as TileDef,
			)

			// Set store active encounter and switch engine screen context to COMBAT
			store.setCombatPhase('INIT')
			store.setEncounter(encounter)
			this.setScreenContext('COMBAT')
			store.addLog(`> ENCOUNTER! Enemies approach!`)
		}
	}
}

let instance: GameEngine | null = null

export const getGameEngine = (): GameEngine => {
	if (!instance) {
		instance = new GameEngine()
	}
	return instance
}
