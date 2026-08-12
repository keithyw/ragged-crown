import { create } from 'zustand'
import type { GameScreen, Position, PlayerCharacter, TileType } from '../types'
import { TILE_DEFS } from '../constants/tiles'

// 21x21 Sample Map Generator
const MAP_SIZE = 21
const generateMap = (): TileType[][] => {
	const grid: TileType[][] = []
	for (let y = 0; y < MAP_SIZE; y++) {
		const row: TileType[] = []
		for (let x = 0; x < MAP_SIZE; x++) {
			if (x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1) {
				row.push('WATER')
			} else if (x === 10 && y === 10) {
				row.push('CASTLE')
			} else if (x === 15 && y === 5) {
				row.push('HUT')
			} else if (x === 5 && y === 15) {
				row.push('CHEST')
			} else if (y === 10 || x === 10) {
				row.push('ROAD')
			} else if ((x < 5 && y < 8) || (x > 15 && y > 12)) {
				row.push('MOUNTAIN')
			} else if ((x > 12 && y < 8) || (x < 8 && y > 14)) {
				row.push('FOREST')
			} else {
				row.push('GRASS')
			}
		}
		grid.push(row)
	}
	return grid
}

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
	// State
	currentScreen: GameScreen
	worldMap: TileType[][]
	playerPos: Position
	party: PlayerCharacter[]
	selectedCharId: string
	logs: string[]

	// Actions
	movePlayer: (dx: number, dy: number) => void
	selectCharacter: (id: string) => void
	addLog: (message: string) => void
	setScreen: (screen: GameScreen) => void
}

export const useGameStore = create<GameState>((set, get) => ({
	currentScreen: 'INTRO',
	worldMap: generateMap(),
	playerPos: { x: 10, y: 8 },
	party: INITIAL_PARTY,
	selectedCharId: 'char-1',
	logs: [
		'System initialized. Zustand game store active.',
		'Use ARROW KEYS or WASD to navigate the realm.',
	],

	selectCharacter: (id: string) => set({ selectedCharId: id }),

	addLog: (message: string) =>
		set((state) => ({ logs: [message, ...state.logs.slice(0, 9)] })),

	movePlayer: (dx: number, dy: number) => {
		const { playerPos, worldMap, addLog } = get()
		const newX = playerPos.x + dx
		const newY = playerPos.y + dy

		if (newY >= 0 && newY < MAP_SIZE && newX >= 0 && newX < MAP_SIZE) {
			const tileType = worldMap[newY][newX]
			const tileDef = TILE_DEFS[tileType]

			if (tileType === 'WATER') {
				addLog('> Rushing deep water blocks your path!')
				return
			}

			set({ playerPos: { x: newX, y: newY } })
			addLog(`> Moved to ${tileDef.name} (${newX}, ${newY}).`)
		}
	},

	setScreen: (screen) => set({ currentScreen: screen }),
}))
