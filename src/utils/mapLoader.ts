import { TILE_KEY_MAP, TILE_REGISTRY } from '@/constants'
import type { Position, TileEvent, Zone, TileDef } from '@/types'

export interface ResolvedCell {
	position: Position
	tile: TileDef
	event?: TileEvent
}

/** Parses a raw ZoneData object into a 2D resolved grid array */
export const parseZoneGrid = (zone: Zone): ResolvedCell[][] => {
	const grid: ResolvedCell[][] = []

	for (let y = 0; y < zone.dimensions.height; y++) {
		const row: ResolvedCell[] = []
		const rowString = zone.terrain[y] || ''

		for (let x = 0; x < zone.dimensions.width; x++) {
			const char = rowString[x] || 'G'
			const tileDef = TILE_REGISTRY[TILE_KEY_MAP[char]]
			const event = zone.events?.[`${x},${y}`]

			row.push({
				position: { x, y },
				tile: tileDef,
				event,
			})
		}
		grid.push(row)
	}

	return grid
}
