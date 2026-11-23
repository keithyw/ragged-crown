import type {
	Action,
	CellKey,
	Condition,
	DifficultyConfig,
	EncounterGroup,
	InteractionType,
	Kind,
	MoveResult,
	Placement,
	Qualifiers,
	Zone,
} from '@shared/types'
import type { FlagValue, PlayerCharacter, Position, PoolItem } from '@/types'
import { cellKey, lookupPlacementDef, type DefLookup } from '@/utils/content'
import {
	addPlacement,
	removePlacement,
	type PlacementMap,
} from '@/utils/placements'
import { buildPool, countCarried, takeFromInventory } from '@/utils/inventory'
import { completeQualifiers } from '@/utils/qualifiers'
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
	/** Opens the menu that hands out the items of a GIVE_ITEM interaction. */
	openGivePool: (pos: Position, items: PoolItem[]) => void
	/** The current zone's difficulty configuration, for rolling qualifiers. */
	getDifficulty: () => DifficultyConfig | undefined
	/**
	 * Starts a set encounter ([Combat 7]). The barrier placement is removed
	 * when the party wins; a flee leaves it where it is.
	 */
	startEncounter: (
		groups: EncounterGroup[],
		barrier: { pos: Position; uid: string },
	) => void
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

	/** The top placement of a cell and its interactions for a trigger, minus used-up ones. */
	private activeInteractions(
		on: InteractionType,
		pos: Position,
		defs: DefLookup,
		host: InteractionHost,
	) {
		const stack = host.getPlacements()[cellKey(pos.x, pos.y)]
		const top = stack?.[stack.length - 1]
		if (!top) return undefined
		const def = lookupPlacementDef(defs, top)
		// A used-up interaction is skipped from then on (DATA-MODEL 4.2).
		const candidates = gatherInteractions(top, def, on).filter(
			(i) => !isExhausted(i, host.getRuns(runKey(top, i))),
		)
		return candidates.length > 0 ? { top, def, candidates } : undefined
	}

	/**
	 * What a trigger on this cell needs before it can run: `none` (nothing
	 * there reacts to it), `free` (it can just run) or `character` (a HAS_ITEM
	 * condition, so a character must be chosen to be checked). [Game 18]
	 */
	public requirementFor(
		on: InteractionType,
		pos: Position,
		defs: DefLookup,
		host: InteractionHost,
	): 'none' | 'free' | 'character' {
		const found = this.activeInteractions(on, pos, defs, host)
		if (!found) return 'none'
		return found.candidates.some((i) =>
			i.conditions?.some((c) => c.type === 'HAS_ITEM'),
		)
			? 'character'
			: 'free'
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
		actor?: PlayerCharacter,
	): boolean {
		const found = this.activeInteractions(on, pos, defs, host)
		if (!found) return false
		const { top, def, candidates } = found

		const { run, failed } = resolveInteraction(candidates, (c) =>
			this.conditionPasses(c, host, top, actor),
		)
		if (run) {
			// Counted when it runs; failed conditions use nothing up.
			if (run.limit !== undefined) host.recordRun(runKey(top, run))
			// GIVE_ITEMs are pooled and handed out together afterwards.
			const gives: PoolItem[] = []
			for (const action of run.actions) {
				this.runAction(action, top, pos, host, gives, {
					defs,
					source: def?.name ?? 'Something',
					actor,
				})
			}
			const pool = buildPool(gives, defs.items)
			if (pool.length > 0) host.openGivePool(pos, pool)
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

	// HAS_ITEM checks the chosen character's own inventory ([Game 18]). With no
	// character chosen (the talk command, [Game 25]) it checks the whole party.
	// A condition that can't be evaluated fails, so the fallback interaction is
	// tried.
	private conditionPasses(
		condition: Condition,
		host: InteractionHost,
		placement: Placement,
		actor?: PlayerCharacter,
	): boolean {
		switch (condition.type) {
			case 'FLAG_SET':
				return this.isFlagSet(host, condition.flag)
			case 'FLAG_NOT_SET':
				return !this.isFlagSet(host, condition.flag)
			case 'HAS_ITEM': {
				let wanted: { itemId?: string; amount?: number }
				if (condition.custom) {
					const value = condition.slot
						? placement.customValues?.[condition.slot]
						: undefined
					wanted = value?.type === 'HAS_ITEM' ? value : {}
				} else {
					wanted = condition
				}
				if (!wanted.itemId) return false
				const itemId = wanted.itemId
				const holders = actor ? [actor] : host.getParty()
				return (
					holders.reduce((sum, c) => sum + countCarried(c, itemId), 0) >=
					(wanted.amount ?? 1)
				)
			}
		}
	}

	private runAction(
		action: Action,
		placement: Placement,
		pos: Position,
		host: InteractionHost,
		gives: PoolItem[],
		ctx: { defs: DefLookup; source: string; actor?: PlayerCharacter },
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
			case 'GIVE_ITEM': {
				let given: { itemId?: string; amount?: number; qualifiers?: Qualifiers }
				if (action.custom) {
					const value = action.slot
						? placement.customValues?.[action.slot]
						: undefined
					given = value?.type === 'GIVE_ITEM' ? value : {}
				} else {
					given = action
				}
				if (!given.itemId) {
					console.warn('[Interaction] GIVE_ITEM has no item to give')
					return
				}
				// A set qualifier is kept; a missing one is rolled here, once, so
				// the pool and anything left on the cell agree ([Game 24]).
				const qualifiers = completeQualifiers(
					ctx.defs.items.get(given.itemId),
					given.qualifiers,
					host.getDifficulty(),
				)
				gives.push({
					itemId: given.itemId,
					quantity: given.amount ?? 1,
					...(qualifiers && { qualifiers }),
				})
				return
			}
			case 'TAKE_ITEM': {
				let taken: { itemId?: string; amount?: number }
				if (action.custom) {
					const value = action.slot
						? placement.customValues?.[action.slot]
						: undefined
					taken = value?.type === 'TAKE_ITEM' ? value : {}
				} else {
					taken = action
				}
				if (!taken.itemId) {
					console.warn('[Interaction] TAKE_ITEM has no item to take')
					return
				}
				this.takeItem(taken.itemId, taken.amount ?? 1, host, ctx)
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
			case 'SPAWN_MONSTER': {
				const value = action.slot
					? placement.customValues?.[action.slot]
					: undefined
				const groups = value?.type === 'SPAWN_MONSTER' ? value.groups : []
				if (!groups?.length) {
					console.warn('[Interaction] SPAWN_MONSTER has no groups')
					return
				}
				host.startEncounter(groups, { pos, uid: placement.uid })
				return
			}
			default:
				console.warn(`[Interaction] action ${action.type} is not implemented`)
		}
	}

	/**
	 * Takes `amount` of an item from the party ([Inventory 26]): the character
	 * who triggered the interaction first, then the rest in party order, across
	 * as many piles as it takes. All or nothing: if the party doesn't have
	 * enough, nothing is taken. Each removal is logged with what took it.
	 */
	private takeItem(
		itemId: string,
		amount: number,
		host: InteractionHost,
		ctx: { defs: DefLookup; source: string; actor?: PlayerCharacter },
	): void {
		const item = ctx.defs.items.get(itemId)
		if (!item) {
			console.warn(`[Interaction] TAKE_ITEM: no item with _id ${itemId}`)
			return
		}
		const party = host.getParty()
		const ordered = [...party].sort((a, b) => a.order - b.order)
		const actor = ordered.find((c) => c.id === ctx.actor?.id)
		const scan = actor
			? [actor, ...ordered.filter((c) => c !== actor)]
			: ordered

		if (scan.reduce((sum, c) => sum + countCarried(c, itemId), 0) < amount) {
			console.warn(
				`[Interaction] TAKE_ITEM: the party lacks ${amount} ${item.name}`,
			)
			return
		}

		let remaining = amount
		const changed = new Map<string, PlayerCharacter>()
		for (const member of scan) {
			if (remaining === 0) break
			const result = takeFromInventory(member, itemId, remaining)
			if (result.taken === 0) continue
			remaining -= result.taken
			changed.set(member.id, result.character)
			host.log(
				`> ${ctx.source} takes ${item.name}${result.taken > 1 ? ` x${result.taken}` : ''} from ${member.name}.`,
			)
		}
		host.setParty(party.map((c) => changed.get(c.id) ?? c))
	}

	/** Adds a def to the top of this cell's stack at runtime. */
	private spawn(
		action: Extract<Action, { type: 'SPAWN' }>,
		placement: Placement,
		pos: Position,
		host: InteractionHost,
	): void {
		let spawned: {
			defKind?: Kind
			defId?: string
			quantity?: number
			qualifiers?: Qualifiers
		}
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
				// Kept as authored; a missing value is rolled when it is picked up.
				...(spawned.qualifiers && { qualifiers: spawned.qualifiers }),
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
