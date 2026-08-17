import { BaseGameEngine, CommandBus, InputManager } from '@/engine'
import { mapLoaderService, PartyService } from '@/services'
import { useGameStore } from '@/store/useGameStore'
import type { Command, GameScreen } from '@/types'

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
		useGameStore.setState({ isMapLoading: true })

		// Load default starting zone map asset
		const startingZone = await mapLoaderService.loadZone('a1')

		useGameStore.setState({
			currentZone: startingZone,
			isMapLoading: false,
		})
	}

	/** Template Method Step 2: Hydrate initial store state */
	protected async setupState(): Promise<void> {
		if (this.isInitialized) return
		try {
			const party = await PartyService.fetchParty()
			useGameStore.setState({
				party,
				playerPosition: { x: 5, y: 5 },
			})
			useGameStore
				.getState()
				.addLog('> Game initialized. Welcome to Crag Valley.')
		} catch (e) {
			console.error(e)
			useGameStore.getState().addLog('> Failed to load party data.')
		}
	}

	/** Template Method Step 3: Map command types on CommandBus to store actions */
	protected registerCommandHandlers(): void {
		this.commandBus.clear()
		// Handle Movement
		this.commandBus.subscribe('MOVE_PLAYER', (cmd: Command) => {
			const { dx, dy } = cmd.payload as { dx: number; dy: number }
			useGameStore.getState().movePlayer(dx, dy)
		})

		// Handle Interactions
		this.commandBus.subscribe('INTERACT', () => {
			useGameStore.getState().addLog('> You interact with the surroundings.')
		})

		// Handle Combat Commands (for future expansion)
		this.commandBus.subscribe('COMBAT_ATTACK', () => {
			useGameStore.getState().addLog('> You strike with your weapon!')
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
}

let instance: GameEngine | null = null

export const getGameEngine = (): GameEngine => {
	if (!instance) {
		instance = new GameEngine()
	}
	return instance
}
