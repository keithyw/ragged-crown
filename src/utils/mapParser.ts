import type {
	ActionPayload,
	Position,
	TileObjectTypes,
	Zone,
	TileDef,
} from '@/types'

// move this into type file
export interface ResolvedCell {
	position: Position
	tile: TileDef
	events?: ActionPayload[]
}

/** Parses a raw ZoneData object into a 2D resolved grid array */
export const parseZoneGrid = (
	tileObjects: TileObjectTypes,
	zone: Zone,
): ResolvedCell[][] => {
	const grid: ResolvedCell[][] = []

	if (!zone.terrain) return grid
	const gridHeight = zone.terrain.length

	for (let y = 0; y < gridHeight; y++) {
		const row: ResolvedCell[] = []
		const gridWidth = zone.terrain[y].length
		for (let x = 0; x < gridWidth; x++) {
			const tile = zone.terrain[y][x]
			const events = zone.tileEvents?.[`${x},${y}`]

			row.push({
				position: { x, y },
				tile: tileObjects[tile],
				events,
			})
		}
		grid.push(row)
	}

	return grid
}
