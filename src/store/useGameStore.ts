import { create } from 'zustand'
import { mapLoaderService } from '@/services'
import type { GameScreen, PlayerCharacter, Position, Zone } from '@/types'
import { evaluateMove } from '@/utils'

// Initial Mock Party (16 members)
const INITIAL_PARTY: PlayerCharacter[] = Array.from({ length: 16 }, (_, i) => ({
	id: `char-${i + 1}`,
	name: i === 0 ? 'Valerius' : i === 1 ? 'Lyra the Bold' : `Recruit ${i + 1}`,
	class: i % 3 === 0 ? 'Fighter' : i % 3 === 1 ? 'Mage' : 'Cleric',
	hp: { current: Math.max(0, 30 - i * 2), max: 30 },
	mp: { current: 15, max: 15 },
	row: i < 5 ? 'F' : i < 10 ? 'M' : 'B',
	status: i === 2 ? 'PSN' : i === 5 ? 'CRIT' : 'OK',
	level: 1,
}))

interface GameState {
	currentZone: Zone | null
	currentScreen: GameScreen
	isMapLoading: boolean
	playerPosition: Position
	party: PlayerCharacter[]
	selectedCharId: string
	logs: string[]

	// Actions
	movePlayer: (dx: number, dy: number) => void
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	loadMap: (zoneId: string, startingPosition?: Position) => Promise<void>
	setPlayerPosition: (position: Position) => void
	setScreen: (screen: GameScreen) => void
}

export const useGameStore = create<GameState>((set, get) => ({
	currentScreen: 'INTRO',
	currentZone: null,
	isMapLoading: false,
	playerPosition: { x: 10, y: 8 },
	party: INITIAL_PARTY,
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

	movePlayer: (dx: number, dy: number) => {
		const { playerPosition, currentZone, addLog } = get()
		if (!currentZone) return

		const res = evaluateMove(playerPosition, dx, dy, currentZone)
		if (!res.canMove) {
			if (res.blockReason) {
				addLog(`> ${res.blockReason}`)
			}
			return
		}

		set({ playerPosition: res.nextPos })

		if (res.targetTile) {
			addLog(
				`> Moved to ${res.targetTile.name} (${res.nextPos.x}, ${res.nextPos.y}).`,
			)
		}
	},

	setPlayerPosition: (position: Position) => set({ playerPosition: position }),

	setScreen: (screen) => set({ currentScreen: screen }),
}))
