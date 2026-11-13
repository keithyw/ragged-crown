import type { Position, TileDef, Zone } from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'
import {
	cellKey,
	lookupPlacementDef,
	type DefLookup,
	type PlacedDef,
} from '@/utils/content'
import type { CellKey, Placement } from '@shared/types'

export interface ResolvedCell {
	position: Position
	terrain?: StoredDoc<TileDef>
	/** The top of the cell's stack: what the player sees and bumps into. */
	top?: StoredDoc<PlacedDef>
}

/** Resolves a zone's terrain `_id`s and the top of each placement stack. */
export const parseZoneGrid = (
	defs: DefLookup,
	zone: Zone,
	placements: Partial<Record<CellKey, Placement[]>>,
): ResolvedCell[][] =>
	zone.terrain.map((row, y) =>
		row.map((terrainId, x) => {
			const stack = placements[cellKey(x, y)]
			const topPlacement = stack?.[stack.length - 1]
			return {
				position: { x, y },
				terrain: defs.tiles.get(terrainId),
				top: topPlacement ? lookupPlacementDef(defs, topPlacement) : undefined,
			}
		}),
	)
