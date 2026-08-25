import { create } from 'zustand'
import { mapLoaderService } from '@/services'
import type {
	ActiveEncounter,
	CombatPhase,
	GameScreen,
	Monster,
	PlanningSubPhase,
	PlayerCharacter,
	QueuedAction,
	Position,
	Zone,
} from '@/types'

interface GameState {
	activeCharacter: number | 0
	actionQueue: QueuedAction[]
	combatPhase: CombatPhase | null
	currentZone: Zone | null
	currentScreen: GameScreen
	encounter: ActiveEncounter | null
	isMapLoading: boolean
	monsters: Monster[]
	playerPosition: Position
	party: PlayerCharacter[]
	selectedCharId: string
	selectedTargetIndex: number
	subPhase: PlanningSubPhase
	logs: string[]

	// Actions
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	loadMap: (zoneId: string, startingPosition?: Position) => Promise<void>
	clearActionQueue: () => void
	damageCharacter: (id: string, damage: number) => void
	queueAction: (action: QueuedAction) => void
	resetPlanning: () => void
	setActiveCharacter: (id: number) => void
	setCombatPhase: (phase: CombatPhase) => void
	setEncounter: (encounter: ActiveEncounter | null) => void
	setMonsters: (monsters: Monster[]) => void
	setParty: (party: PlayerCharacter[]) => void
	setSubPhase: (phase: PlanningSubPhase) => void
	setPlayerPosition: (position: Position) => void
	setScreen: (screen: GameScreen) => void
	setSelectedTargetIndex: (index: number) => void
}

export const useGameStore = create<GameState>((set) => ({
	activeCharacter: 0,
	actionQueue: [],
	combatPhase: null,
	currentScreen: 'INTRO',
	currentZone: null,
	encounter: null,
	isMapLoading: false,
	logs: [],
	monsters: [],
	playerPosition: { x: 10, y: 8 },
	party: [],
	selectedCharId: 'char-1',
	subPhase: 'ACTION_SELECT',
	selectedTargetIndex: 0,

	selectCharacter: (id: string) => set({ selectedCharId: id }),

	addLog: (message: string) =>
		set((state) => ({ logs: [message, ...state.logs.slice(0, 9)] })),

	loadMap: async (zoneId: string, startingPosition?: Position) => {
		set({ isMapLoading: true })
		try {
			const zone = await mapLoaderService.loadZone(zoneId)
			set({
				currentZone: zone,
				isMapLoading: false,
				...(startingPosition && { playerPosition: startingPosition }),
			})

			if (zone.events) {
				const targets = Object.values(zone.events)
					.map((k) => k.targetZone)
					.filter((id): id is string => Boolean(id))
				mapLoaderService.preloadZones(targets)
			}
		} catch (e) {
			console.error(e)
			set({ isMapLoading: false })
		}
	},

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
	setCombatPhase: (phase) => set({ combatPhase: phase }),
	setEncounter: (encounter) => set({ encounter }),
	setMonsters: (monsters) => set({ monsters }),
	setParty: (party) => set({ party }),
	setPlayerPosition: (position: Position) => set({ playerPosition: position }),
	setScreen: (screen) => set({ currentScreen: screen }),
	setSelectedTargetIndex: (index) => set({ selectedTargetIndex: index }),
	setSubPhase: (phase) => set({ subPhase: phase }),
}))
