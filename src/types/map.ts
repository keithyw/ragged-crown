export type TileType =
	| 'GRASS'
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
	bg: string
	name: string
	moveCost: number
	description: string
}

export interface Position {
	x: number
	y: number
}
