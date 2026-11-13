import type { CellKey, Placement } from '@shared/types'
import { cellKey } from '@/utils/content'

export type PlacementMap = Partial<Record<CellKey, Placement[]>>

// Runtime changes to a zone's placements. They return a new map and leave the
// loaded zone alone (DATA-MODEL 5).

/** Puts a placement on top of a cell's stack. */
export const addPlacement = (
	placements: PlacementMap,
	pos: { x: number; y: number },
	placement: Placement,
): PlacementMap => {
	const key = cellKey(pos.x, pos.y)
	return { ...placements, [key]: [...(placements[key] ?? []), placement] }
}

/** Takes the placement with this `uid` out of a cell's stack. */
export const removePlacement = (
	placements: PlacementMap,
	pos: { x: number; y: number },
	uid: string,
): PlacementMap => {
	const key = cellKey(pos.x, pos.y)
	const stack = (placements[key] ?? []).filter((p) => p.uid !== uid)
	const next = { ...placements }
	if (stack.length > 0) next[key] = stack
	else delete next[key]
	return next
}

/** The portal the player is standing on: the top-most one in the stack. */
export const findPortalAt = (
	placements: PlacementMap,
	pos: { x: number; y: number },
): Placement | undefined =>
	[...(placements[cellKey(pos.x, pos.y)] ?? [])]
		.reverse()
		.find((p) => p.defKind === 'portal')
