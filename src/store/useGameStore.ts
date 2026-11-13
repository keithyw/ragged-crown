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
	FlagValue,
	SaveGameDocument,
} from '@/types'
import type { CellKey, Placement, Zone } from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'

/** How many event log messages are kept (newest first). */
const MAX_LOG_MESSAGES = 20

interface GameState {
	activeCharacter: number | 0
	actionQueue: QueuedAction[]
	combatPhase: CombatPhase | null
	currentZone: StoredDoc<Zone> | null
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
	/** Runtime placements of the zones left behind, by zone `_id`, so changes last the session. */
	zoneRuntimes: Record<string, Partial<Record<CellKey, Placement[]>>>
	/** Where each portal was entered from, newest last; a `{ back: true }` destination pops it. */
	entryStack: { zoneId: string; pos: Position }[]
	/** Game flags set by SET_FLAG (runtime; persisting them is undecided). */
	flags: Record<string, FlagValue>
	/** Times each interaction has run, keyed `uid:interactionId` (see `runKey`). */
	interactionRuns: Record<string, number>
	logs: string[]

	// Actions
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	setFlag: (flag: string, value?: FlagValue) => void
	recordRun: (key: string) => void
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
	setCurrentZone: (zone: StoredDoc<Zone>) => void
	setRuntimePlacements: (
		placements: Partial<Record<CellKey, Placement[]>>,
	) => void
	pushEntry: (entry: { zoneId: string; pos: Position }) => void
	popEntry: () => void
	/** Forgets everything the player changed: flags, run counts, zone changes. */
	resetRuntime: () => void
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
	flags: {},
	interactionRuns: {},
	logs: [],
	monsters: [],
	playerPosition: { x: 3, y: 3 },
	party: [],
	savedGame: null,
	selectedCharId: 'char-1',
	subPhase: 'ACTION_SELECT',
	selectedTargetIndex: 0,
	runtimePlacements: {},
	zoneRuntimes: {},
	entryStack: [],

	selectCharacter: (id: string) => set({ selectedCharId: id }),

	addLog: (message: string) =>
		set((state) => ({
			logs: [message, ...state.logs.slice(0, MAX_LOG_MESSAGES - 1)],
		})),

	setFlag: (flag, value = true) =>
		set((state) => ({ flags: { ...state.flags, [flag]: value } })),

	recordRun: (key) =>
		set((state) => ({
			interactionRuns: {
				...state.interactionRuns,
				[key]: (state.interactionRuns[key] ?? 0) + 1,
			},
		})),

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
		set((state) => {
			// Keep the zone being left, and bring back this one's if it was visited.
			const zoneRuntimes = { ...state.zoneRuntimes }
			if (state.currentZone) {
				zoneRuntimes[state.currentZone._id] = state.runtimePlacements
			}
			return {
				currentZone: zone,
				zoneRuntimes,
				runtimePlacements:
					zoneRuntimes[zone._id] ?? structuredClone(zone.placements ?? {}),
			}
		}),

	setRuntimePlacements: (runtimePlacements) => set({ runtimePlacements }),

	pushEntry: (entry) =>
		set((state) => ({ entryStack: [...state.entryStack, entry] })),
	popEntry: () =>
		set((state) => ({ entryStack: state.entryStack.slice(0, -1) })),
	resetRuntime: () =>
		set({
			currentZone: null,
			flags: {},
			interactionRuns: {},
			runtimePlacements: {},
			zoneRuntimes: {},
			entryStack: [],
		}),
}))
