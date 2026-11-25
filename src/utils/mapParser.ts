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
	/** The topmost visible thing in the cell's stack: what the player sees. */
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
			const stack = placements[cellKey(x, y)] ?? []
			// The topmost placement that isn't invisible: an invisible one lets
			// what is below it (or the terrain) show through.
			let top: ResolvedCell['top']
			for (let i = stack.length - 1; i >= 0; i--) {
				top = appearanceOf(defs, stack[i], monsters)
				if (top?.kind === 'object' && top.isInvisible) {
					top = undefined
					continue
				}
				break
			}
			return {
				position: { x, y },
				terrain: defs.tiles.get(terrainId),
				top,
			}
		}),
	)
