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

/**
 * Takes the object placement with this `uid` out of whichever cell holds it
 * ([Game 26]). Undefined when no object placement in the map has that `uid`,
 * so the caller can warn. Only that placement goes; the rest of its stack stays.
 */
export const removeObjectByUid = (
	placements: PlacementMap,
	uid: string,
): PlacementMap | undefined => {
	for (const [key, stack] of Object.entries(placements)) {
		const found = stack?.find((p) => p.uid === uid)
		if (!stack || !found) continue
		if (found.defKind !== 'object') return undefined
		const rest = stack.filter((p) => p.uid !== uid)
		const next = { ...placements }
		if (rest.length > 0) next[key as CellKey] = rest
		else delete next[key as CellKey]
		return next
	}
	return undefined
}

/** The portal the player is standing on: the top-most one in the stack. */
export const findPortalAt = (
	placements: PlacementMap,
	pos: { x: number; y: number },
): Placement | undefined =>
	[...(placements[cellKey(pos.x, pos.y)] ?? [])]
		.reverse()
		.find((p) => p.defKind === 'portal')
