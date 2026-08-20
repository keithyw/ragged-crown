export interface GameTime {
	year: number
	month: number
	day: number
}

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

export type GameScreen =
	| 'INTRO'
	| 'MAIN_MENU'
	| 'CHARACTER_CREATION'
	| 'SETTINGS'
	| 'WORLD_MAP'
	| 'COMBAT'
	| 'COMBAT_PLANNING'
	| 'DIALOGUE'
