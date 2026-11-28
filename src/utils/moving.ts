import type { CellKey, Placement, Zone } from '@shared/types'
import type { PlayerCharacter, Position } from '@/types'
import { cellKey, lookupPlacementDef, type DefLookup } from './content'
import { carryLimit } from './inventory'
import type { PlacementMap } from './placements'
import { statusesOf } from './status'

// Pushing things around the map ([Game 31], tools DATA-MODEL.md section 9).

const CARRIED = ['item', 'weapon', 'armor']

const isHidden = (defs: DefLookup, placement: Placement): boolean => {
	const def = lookupPlacementDef(defs, placement)
	return def?.kind === 'object' && !!def.isInvisible
}

/**
 * What the move command selects on a cell: the top placement the player can
 * see. An invisible object is passed over, so it is never the reason for a
 * refusal.
 */
export const thingToMove = (
	stack: Placement[],
	defs: DefLookup,
): Placement | undefined => [...stack].reverse().find((p) => !isHidden(defs, p))

/** Every item can be pushed, an object only if its def says so, nothing else. */
export const canBeMoved = (placement: Placement, defs: DefLookup): boolean => {
	const def = lookupPlacementDef(defs, placement)
	if (!def) return false
	if (CARRIED.includes(placement.defKind)) return true
	return def.kind === 'object' && !!def.isMoveable
}

/** A thing's weight: its def's, times its quantity, plus all it contains. */
export const placementWeight = (
	placement: Placement,
	defs: DefLookup,
): number => {
	const def = lookupPlacementDef(defs, placement)
	const own = def && 'weight' in def ? (def.weight ?? 0) : 0
	return (
		own * (placement.quantity ?? 1) +
		(placement.contents ?? []).reduce(
			(sum, p) => sum + placementWeight(p, defs),
			0,
		)
	)
}

/**
 * What the party can push: every living member's carry limit added together,
 * whatever they are already carrying.
 */
export const pushLimit = (party: PlayerCharacter[]): number =>
	party
		.filter((p) => !statusesOf(p).includes('dead'))
		.reduce((sum, p) => sum + carryLimit(p), 0)

/**
 * Whether a thing can be pushed onto a cell: inside the zone, on walkable
 * terrain, and with nothing visible there but items and stackable objects.
 */
export const canPushOnto = (
	zone: Zone,
	placements: PlacementMap,
	pos: Position,
	defs: DefLookup,
): boolean => {
	const { width, height } = zone.dimensions || { width: 0, height: 0 }
	if (pos.x < 0 || pos.x >= width || pos.y < 0 || pos.y >= height) return false
	if (!defs.tiles.get(zone.terrain[pos.y]?.[pos.x])?.isWalkable) return false
	const stack = placements[cellKey(pos.x, pos.y) as CellKey] ?? []
	return stack.every((p) => {
		if (CARRIED.includes(p.defKind) || isHidden(defs, p)) return true
		const def = lookupPlacementDef(defs, p)
		return def?.kind === 'object' && !!def.isStackable
	})
}
