import type { MonsterDef, Position, TileDef, Zone } from '@shared/types'
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
	top?: StoredDoc<PlacedDef | MonsterDef>
}

/**
 * What a placement looks like. A set encounter's barrier ([Combat 7]) shows
 * as the monster its `showAs` group names, unless it hides the sprite.
 */
const appearanceOf = (
	defs: DefLookup,
	placement: Placement,
	monsters: Map<string, StoredDoc<MonsterDef>>,
): StoredDoc<PlacedDef | MonsterDef> | undefined => {
	for (const v of Object.values(placement.customValues ?? {})) {
		if (v.type !== 'SPAWN_MONSTER' || v.hideSprite) continue
		const group = v.showAs === undefined ? undefined : v.groups?.[v.showAs]
		const monster = group && monsters.get(group.defId)
		if (monster) return monster
	}
	return lookupPlacementDef(defs, placement)
}

/** Resolves a zone's terrain `_id`s and the top of each placement stack. */
export const parseZoneGrid = (
	defs: DefLookup,
	zone: Zone,
	placements: Partial<Record<CellKey, Placement[]>>,
	monsters: Map<string, StoredDoc<MonsterDef>> = new Map(),
): ResolvedCell[][] =>
	zone.terrain.map((row, y) =>
		row.map((terrainId, x) => {
			const stack = placements[cellKey(x, y)]
			const topPlacement = stack?.[stack.length - 1]
			return {
				position: { x, y },
				terrain: defs.tiles.get(terrainId),
				top: topPlacement
					? appearanceOf(defs, topPlacement, monsters)
					: undefined,
			}
		}),
	)
