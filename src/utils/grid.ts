import type { Position } from '@/types'

/** Converts a 1D array index to 2D grid coordinates based on column count */
export const indexToCoords = (index: number, cols: number): Position => ({
	x: index % cols,
	y: Math.floor(index / cols),
})

/** Checks if two positions share identical coordinates */
export const isSamePosition = (a: Position, b: Position): boolean =>
	a.x === b.x && a.y === b.y
