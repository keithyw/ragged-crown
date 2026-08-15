// src/utils/movement.ts
import { TILE_KEY_MAP, TILE_REGISTRY } from '@/constants'
import type { Position, TileDef, Zone } from '@/types'

export interface MoveResult {
	canMove: boolean
	nextPos: Position
	targetTile?: TileDef
	blockReason?: string
}

/** Determines if a target coordinate falls within the active zone boundaries */
export const isWithinBounds = (pos: Position, zone: Zone): boolean => {
	const { width, height } = zone.dimensions
	return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
}

/** Retrieves the TileDef at a specific (x, y) coordinate in a Zone */
export const getTileAt = (pos: Position, zone: Zone): TileDef | null => {
	if (!isWithinBounds(pos, zone)) return null

	const rowString = zone.terrain[pos.y]
	if (!rowString) return null

	const char = rowString[pos.x]
	return TILE_REGISTRY[TILE_KEY_MAP[char]] || null
}

/** Evaluates whether a player can move to a target coordinate */
export const evaluateMove = (
	currentPos: Position,
	dx: number,
	dy: number,
	zone: Zone,
): MoveResult => {
	const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy }

	// 1. Boundary check
	if (!isWithinBounds(nextPos, zone)) {
		return {
			canMove: false,
			nextPos: currentPos,
			blockReason: 'The edge of the area blocks your path.',
		}
	}

	// 2. Fetch tile definition
	const targetTile = getTileAt(nextPos, zone)
	if (!targetTile) {
		return {
			canMove: false,
			nextPos: currentPos,
			blockReason: 'An impenetrable barrier blocks your way.',
		}
	}

	// 3. Passability check via TileDef metadata
	if (targetTile.isWalkable === false) {
		return {
			canMove: false,
			nextPos: currentPos,
			targetTile,
			blockReason: `${targetTile.name} blocks your path!`,
		}
	}

	return {
		canMove: true,
		nextPos,
		targetTile,
	}
}
