import type {
	Action,
	CellKey,
	Condition,
	InteractionType,
	Kind,
	MoveResult,
	Placement,
	Zone,
} from '@shared/types'
import type { FlagValue, PlayerCharacter, Position } from '@/types'
import { cellKey, lookupPlacementDef, type DefLookup } from '@/utils/content'
import {
	addPlacement,
	removePlacement,
	type PlacementMap,
} from '@/utils/placements'
import { applyStatChange, type ModifyAttribute } from '@/utils/stats'
import {
	failureMessage,
	gatherInteractions,
	isExhausted,
	resolveInteraction,
	runKey,
} from '@/utils/interactions'

/** What the interaction engine reads and changes while it runs. */
export interface InteractionHost {
	log: (message: string) => void
	getFlag: (flag: string) => FlagValue | undefined
	setFlag: (flag: string) => void
	getRuns: (key: string) => number
	recordRun: (key: string) => void
	getPlacements: () => PlacementMap
	setPlacements: (placements: PlacementMap) => void
	getParty: () => PlayerCharacter[]
	setParty: (party: PlayerCharacter[]) => void
}

export class InteractionEngine {
	private isWithinBounds(pos: Position, zone: Zone): boolean {
		const { width, height } = zone.dimensions || { width: 0, height: 0 }
		return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
	}

	/**
	 * A cell is blocked if its terrain is not walkable or any placement in its
	 * stack is solid (DATA-MODEL.md 1.4).
	 */
	public evaluateMove(
		currentPos: Position,
		dx: number,
		dy: number,
		zone: Zone,
		placements: Partial<Record<CellKey, Placement[]>>,
		defs: DefLookup,
	): MoveResult {
		const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy }
		if (!this.isWithinBounds(nextPos, zone)) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'The edge of the area blocks your path.',
			}
		}

		const targetTile = defs.tiles.get(zone.terrain[nextPos.y]?.[nextPos.x])
		if (!targetTile) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'An impenetrable barrier blocks your way.',
			}
		}

		// Unchanged from before: an unset isWalkable counts as blocked.
		if (!targetTile.isWalkable) {
			return {
				canMove: false,
				nextPos: currentPos,
				targetTile,
				blockReason: `${targetTile.name} blocks your path!`,
			}
		}

		for (const placement of placements[cellKey(nextPos.x, nextPos.y)] ?? []) {
			const def = lookupPlacementDef(defs, placement)
			if (def?.kind === 'object' && def.isSolid) {
				return {
					canMove: false,
					nextPos: currentPos,
					targetTile,
					blockReason: `${def.name} blocks your path!`,
				}
			}
		}

		return {
			canMove: true,
			nextPos,
			targetTile,
		}
	}

	/**
	 * Runs what a trigger does on the top placement of a cell (DATA-MODEL 4.1).
	 * Returns true when the cell had an interaction for this trigger, whether
	 * it ran or its conditions failed, so the caller knows it was handled.
	 */
	public trigger(
		on: InteractionType,
		pos: Position,
		defs: DefLookup,
		host: InteractionHost,
	): boolean {
		const stack = host.getPlacements()[cellKey(pos.x, pos.y)]
		const top = stack?.[stack.length - 1]
		if (!top) return false
		const def = lookupPlacementDef(defs, top)

		// A used-up interaction is skipped from then on (DATA-MODEL 4.2).
		const candidates = gatherInteractions(top, def, on).filter(
			(i) => !isExhausted(i, host.getRuns(runKey(top, i))),
		)
		if (candidates.length === 0) return false

		const { run, failed } = resolveInteraction(candidates, (c) =>
			this.conditionPasses(c, host),
		)
		if (run) {
			// Counted when it runs; failed conditions use nothing up.
			if (run.limit !== undefined) host.recordRun(runKey(top, run))
			for (const action of run.actions) {
				this.runAction(action, top, pos, host)
			}
		} else {
			host.log(`> ${failureMessage(failed, def) ?? 'Nothing happens.'}`)
		}
		return true
	}

	// A flag is set once it has a value other than false.
	private isFlagSet(host: InteractionHost, flag: string): boolean {
		const value = host.getFlag(flag)
		return value !== undefined && value !== false
	}

	// TODO [Game 2]: HAS_ITEM waits for inventory ([Game 3], and the decision
	// in [Game 5]). Until then a condition that can't be evaluated fails, so
	// the fallback interaction is tried.
	private conditionPasses(
		condition: Condition,
		host: InteractionHost,
	): boolean {
		switch (condition.type) {
			case 'FLAG_SET':
				return this.isFlagSet(host, condition.flag)
			case 'FLAG_NOT_SET':
				return !this.isFlagSet(host, condition.flag)
			default:
				console.warn(
					`[Interaction] condition ${condition.type} is not implemented`,
				)
				return false
		}
	}

	private runAction(
		action: Action,
		placement: Placement,
		pos: Position,
		host: InteractionHost,
	): void {
		switch (action.type) {
			case 'SHOW_DIALOG': {
				const text = action.custom
					? this.customDialog(action.slot, placement)
					: action.text
				if (text) host.log(`> ${text}`)
				else console.warn('[Interaction] SHOW_DIALOG has no text to show')
				return
			}
			case 'SET_FLAG':
				host.setFlag(action.flag)
				return
			case 'MODIFY_ATTRIBUTE':
				this.modifyAttribute(action, host)
				return
			case 'REMOVE_SELF':
				host.setPlacements(
					removePlacement(host.getPlacements(), pos, placement.uid),
				)
				return
			case 'SPAWN':
				this.spawn(action, placement, pos, host)
				return
			default:
				console.warn(`[Interaction] action ${action.type} is not implemented`)
		}
	}

	/** Adds a def to the top of this cell's stack at runtime. */
	private spawn(
		action: Extract<Action, { type: 'SPAWN' }>,
		placement: Placement,
		pos: Position,
		host: InteractionHost,
	): void {
		let spawned: { defKind?: Kind; defId?: string; quantity?: number }
		if (action.custom) {
			const value = action.slot
				? placement.customValues?.[action.slot]
				: undefined
			spawned = value?.type === 'SPAWN' ? value : {}
		} else {
			spawned = action
		}
		if (!spawned.defKind || !spawned.defId) {
			console.warn('[Interaction] SPAWN has nothing to spawn')
			return
		}
		host.setPlacements(
			addPlacement(host.getPlacements(), pos, {
				uid: crypto.randomUUID(),
				defKind: spawned.defKind,
				defId: spawned.defId,
				...(spawned.quantity !== undefined && { quantity: spawned.quantity }),
			}),
		)
	}

	private modifyAttribute(
		action: ModifyAttribute,
		host: InteractionHost,
	): void {
		const party = host.getParty()
		const targets = this.statTargets(action, party)
		if (targets.length === 0) return

		const changed = new Map<string, PlayerCharacter>()
		for (const character of targets) {
			const change = applyStatChange(character, action)
			if (!change) {
				// xp and level: waiting on [Game 5].
				console.warn(
					`[Interaction] MODIFY_ATTRIBUTE ${action.attribute} is not implemented`,
				)
				return
			}
			changed.set(character.id, change.character)
			host.log(`> ${change.message}`)
		}
		host.setParty(party.map((c) => changed.get(c.id) ?? c))
	}

	// TODO [Game 5]: who "the character" is when nobody chooses (DATA-MODEL
	// 4.4). Until a chooser exists it is the first party member still standing.
	private statTargets(
		action: ModifyAttribute,
		party: PlayerCharacter[],
	): PlayerCharacter[] {
		const standing = party.filter((c) => c.hp.current > 0)
		if (action.target === 'party') {
			// A downed member can't be hurt or healed by a current-HP change.
			const isCurrentHp = action.attribute === 'hp' && action.bar !== 'max'
			return isCurrentHp ? standing : party
		}
		const first = standing[0] ?? party[0]
		return first ? [first] : []
	}

	/** A custom dialog's text, from the placement's value for the def's slot. */
	private customDialog(
		slot: string | undefined,
		placement: Placement,
	): string | undefined {
		const value = slot ? placement.customValues?.[slot] : undefined
		return value?.type === 'SHOW_DIALOG' ? value.text : undefined
	}
}

let instance: InteractionEngine | null = null
export const getInteractionEngine = (): InteractionEngine => {
	if (!instance) instance = new InteractionEngine()
	return instance
}
