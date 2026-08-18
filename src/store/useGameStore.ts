import { create } from 'zustand'
import { mapLoaderService } from '@/services'
import type {
	ActiveEncounter,
	GameScreen,
	Monster,
	PlayerCharacter,
	Position,
	Zone,
} from '@/types'

interface GameState {
	currentZone: Zone | null
	currentScreen: GameScreen
	encounter: ActiveEncounter | null
	isMapLoading: boolean
	monsters: Monster[]
	playerPosition: Position
	party: PlayerCharacter[]
	selectedCharId: string
	logs: string[]

	// Actions
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	loadMap: (zoneId: string, startingPosition?: Position) => Promise<void>
	setEncounter: (encounter: ActiveEncounter) => void
	setMonsters: (monsters: Monster[]) => void
	setParty: (party: PlayerCharacter[]) => void
	setPlayerPosition: (position: Position) => void
	setScreen: (screen: GameScreen) => void
}

export const useGameStore = create<GameState>((set) => ({
	currentScreen: 'INTRO',
	currentZone: null,
	encounter: null,
	isMapLoading: false,
	monsters: [],
	playerPosition: { x: 10, y: 8 },
	party: [],
	selectedCharId: 'char-1',
	logs: [],

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

	setEncounter: (encounter) => set({ encounter }),
	setMonsters: (monsters) => set({ monsters }),
	setParty: (party) => set({ party }),
	setPlayerPosition: (position: Position) => set({ playerPosition: position }),
	setScreen: (screen) => set({ currentScreen: screen }),
}))
