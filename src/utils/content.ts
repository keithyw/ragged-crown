import type {
	CellKey,
	CreatureDef,
	ItemDef,
	ObjectDef,
	Placement,
	PortalDef,
	TileDef,
} from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'

// Runtime helper, copied from the tools (`lib/utils/Zonegrid.ts`): the shared
// types are types only. "x,y", x first, no spaces; only build keys with this.
export const cellKey = (x: number, y: number): CellKey => `${x},${y}`

export type EntityDef = ObjectDef | CreatureDef | PortalDef
export type PlacedDef = EntityDef | ItemDef

/** The loaded defs, keyed by `_id` (see `useContentStore`). */
export interface DefLookup {
	tiles: Map<string, StoredDoc<TileDef>>
	items: Map<string, StoredDoc<ItemDef>>
	entities: Map<string, StoredDoc<EntityDef>>
}

/** A placement's def: `defKind` picks the collection, `defId` the `_id`. */
export const lookupPlacementDef = (
	defs: DefLookup,
	placement: Placement,
): StoredDoc<PlacedDef> | undefined =>
	placement.defKind === 'item'
		? defs.items.get(placement.defId)
		: defs.entities.get(placement.defId)
