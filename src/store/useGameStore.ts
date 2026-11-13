import { create } from 'zustand'
import type {
	ActiveEncounter,
	CharacterSheetContext,
	CombatPhase,
	GameScreen,
	Monster,
	PlanningSubPhase,
	PlayerCharacter,
	Position,
	QueuedAction,
	SaveGameDocument,
} from '@/types'
import type { CellKey, Placement, Zone } from '@shared/types'

interface GameState {
	activeCharacter: number | 0
	actionQueue: QueuedAction[]
	combatPhase: CombatPhase | null
	currentZone: Zone | null
	currentScreen: GameScreen
	encounter: ActiveEncounter | null
	inspectedCharacterId: string | null
	inspectedContext: CharacterSheetContext
	isMapLoading: boolean
	monsters: Monster[]
	playerPosition: Position
	party: PlayerCharacter[]
	savedGame: SaveGameDocument | null
	selectedCharId: string
	selectedTargetIndex: number
	subPhase: PlanningSubPhase
	/** Mutable copy of `currentZone.placements`; the zone itself is never changed. */
	runtimePlacements: Partial<Record<CellKey, Placement[]>>
	logs: string[]

	// Actions
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	clearActionQueue: () => void
	damageCharacter: (id: string, damage: number) => void
	queueAction: (action: QueuedAction) => void
	resetPlanning: () => void
	setActiveCharacter: (id: number) => void
	setCombatPhase: (phase: CombatPhase) => void
	setEncounter: (encounter: ActiveEncounter | null) => void
	setInspectedCharacter: (
		characterId: string | null,
		context?: CharacterSheetContext,
	) => void
	setMonsters: (monsters: Monster[]) => void
	setParty: (party: PlayerCharacter[]) => void
	setSavedGame: (game: SaveGameDocument) => void
	setSubPhase: (phase: PlanningSubPhase) => void
	setPlayerPosition: (position: Position) => void
	setScreen: (screen: GameScreen) => void
	setSelectedTargetIndex: (index: number) => void
	setCurrentZone: (zone: Zone) => void
}

export const useGameStore = create<GameState>((set) => ({
	activeCharacter: 0,
	actionQueue: [],
	combatPhase: null,
	currentScreen: 'INTRO',
	currentZone: null,
	encounter: null,
	inspectedCharacterId: null,
	inspectedContext: 'GUILD',
	isMapLoading: false,
	logs: [],
	monsters: [],
	playerPosition: { x: 3, y: 3 },
	party: [],
	savedGame: null,
	selectedCharId: 'char-1',
	subPhase: 'ACTION_SELECT',
	selectedTargetIndex: 0,
	runtimePlacements: {},

	selectCharacter: (id: string) => set({ selectedCharId: id }),

	addLog: (message: string) =>
		set((state) => ({ logs: [message, ...state.logs.slice(0, 9)] })),

	clearActionQueue: () => set({ actionQueue: [] }),

	damageCharacter: (id: string, damage: number) =>
		set((state) => ({
			party: state.party.map((p) => {
				if (p.id !== id) return p
				const nextHp = Math.max(0, p.hp.current - damage)
				return {
					...p,
					hp: { ...p.hp, current: nextHp },
				}
			}),
		})),

	queueAction: (action) =>
		set((state) => ({
			actionQueue: [...state.actionQueue, action],
		})),
	resetPlanning: () =>
		set({ actionQueue: [], activeCharacter: 0, combatPhase: 'PLANNING' }),

	setActiveCharacter: (id) => set({ activeCharacter: id }),
	setInspectedCharacter: (characterId, context = 'GUILD') =>
		set({ inspectedCharacterId: characterId, inspectedContext: context }),
	setCombatPhase: (phase) => set({ combatPhase: phase }),
	setEncounter: (encounter) => set({ encounter }),
	setMonsters: (monsters) => set({ monsters }),
	setParty: (party) => set({ party }),
	setPlayerPosition: (position: Position) => set({ playerPosition: position }),
	setSavedGame: (game) => set({ savedGame: game }),
	setScreen: (screen) => set({ currentScreen: screen }),
	setSelectedTargetIndex: (index) => set({ selectedTargetIndex: index }),
	setSubPhase: (phase) => set({ subPhase: phase }),
	setCurrentZone: (zone) =>
		set({
			currentZone: zone,
			runtimePlacements: structuredClone(zone.placements ?? {}),
		}),
}))
