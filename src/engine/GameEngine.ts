// src/engine/GameEngine.ts
import { BaseGameEngine } from '@/engine/BaseGameEngine'
import { combatEngine } from '@/engine/CombatEngine'
import { inputManager } from '@/engine/InputManager'
import {
	CharacterStorageService,
	EncounterService,
	mapLoaderService,
} from '@/services'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'
import type { CharacterSheetContext, TileDef } from '@/types'
import { evaluateMove } from '@/utils'

export class GameEngine extends BaseGameEngine {
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
			const [startingZone, monsters] = await Promise.all([
				mapLoaderService.loadZone('a1'),
				EncounterService.fetchMonsters(),
			])
			useCharacterCreationStore.setState({
				createdCharacters: characters,
			})
			useGameStore.setState({
				currentZone: startingZone,
				isMapLoading: false,
				monsters,
			})
		} catch (e) {
			console.error(e)
		}
	}

	protected setupState(): void {
		if (this.isInitialized) return
		useGameStore.setState({ playerPosition: { x: 5, y: 5 } })
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

	private movePlayer(dx: number, dy: number): void {
		const store = useGameStore.getState()
		if (!store.currentZone) return

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
