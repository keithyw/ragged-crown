export interface Position {
	x: number
	y: number
}
export type TileType =
	| 'GRASS'
	| 'DIRT'
	| 'FOREST'
	| 'MOUNTAIN'
	| 'WATER'
	| 'ROAD'
	| 'CASTLE'
	| 'HUT'
	| 'CHEST'

export interface TileDef {
	type: TileType
	symbol: string
	color: string
	name: string
	bg: string
	moveCost: number
	isWalkable?: boolean
	spriteCoords: Position
	description?: string
}

export type InteractionType =
	'WALK' | 'TALK' | 'PICKUP' | 'DROP' | 'USE' | 'OPEN' | 'CLOSE'
export interface TileEvent {
	id: string
	triggerOn: InteractionType
	text?: string
	itemId?: string
}

export interface Zone {
	id: string
	name: string
	dimensions: { width: number; height: number }
	dangerLevel: number
	terrain: string[]
	events?: Record<string, TileEvent>
}
