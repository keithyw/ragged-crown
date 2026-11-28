import type {
	Action,
	Condition,
	GiveEntry,
	Interaction,
	InteractionType,
	Placement,
} from '@shared/types'
import type { PlacedDef } from '@/utils/content'

// Pure pieces of the interaction engine (DATA-MODEL.md 4.1, 4.7), kept apart
// from the engine so they are easy to test.

/**
 * The interactions that could run for a trigger on a placement: the
 * placement's own first, then its def's (DATA-MODEL 4.1). Items have none on
 * the map (bumping one picks it up, [Game 3]).
 */
export const gatherInteractions = (
	placement: Placement,
	def: PlacedDef | undefined,
	on: InteractionType,
): Interaction[] => {
	const fromDef =
		def?.kind === 'object' || def?.kind === 'portal'
			? (def.interactions ?? [])
			: []
	return [...(placement.interactions ?? []), ...fromDef].filter(
		(i) => i.on === on,
	)
}

/** Key for an interaction's run count: per placement `uid`, per interaction `id`. */
export const runKey = (
	placement: Placement,
	interaction: Interaction,
): string => `${placement.uid}:${interaction.id}`

/**
 * What a GIVE_ITEM hands over: the action's own list, or for a custom one the
 * placement's. A give saved before lists ([Interactions 18]) held one item in
 * its own fields, and reads as a list of one with no `uid`. The tools read it
 * the same way (`lib/utils/gives.ts` there).
 */
export const giveEntries = (
	action: Action,
	placement: Placement,
): GiveEntry[] => {
	if (action.type !== 'GIVE_ITEM') return []
	const give = action.custom ? placement.customValues?.[action.slot] : action
	if (give?.type !== 'GIVE_ITEM') return []
	if (give.items) return give.items
	const { itemId, amount, qualifiers, chance, giveLimit, target } = give
	return itemId
		? [{ itemId, amount, qualifiers, chance, giveLimit, target }]
		: []
}

/**
 * The run counter key for one item's successes: the GIVE_ITEM's place in the
 * interaction and the item's `uid`. An item saved before lists has no `uid`.
 */
export const giveKey = (
	placement: Placement,
	interaction: Interaction,
	index: number,
	uid?: string,
): string =>
	`${runKey(placement, interaction)}:give:${index}${uid ? `:${uid}` : ''}`

/**
 * Rolls every item of an interaction's gives, each on its own `chance` and
 * `giveLimit` ([Interactions 16], [Inventory 52]). `byAction` holds, per
 * action, the items that came up; `counted` the keys of those with a limit.
 * `nothing` means there were items and every one of them failed.
 */
export const rollGives = (
	placement: Placement,
	interaction: Interaction,
	getRuns: (key: string) => number,
	rand: () => number = Math.random,
) => {
	let listed = 0
	let passed = 0
	const counted: string[] = []
	const byAction = interaction.actions.map((action, index) =>
		giveEntries(action, placement).filter((entry) => {
			listed++
			const key = giveKey(placement, interaction, index, entry.uid)
			const { chance, giveLimit } = entry
			if (giveLimit !== undefined && getRuns(key) >= giveLimit) return false
			if (chance !== undefined && rand() * 100 >= chance) return false
			if (giveLimit !== undefined) counted.push(key)
			passed++
			return true
		}),
	)
	return { byAction, counted, nothing: listed > 0 && passed === 0 }
}

/** An interaction is used up once it has run `limit` times (absent = never). */
export const isExhausted = (interaction: Interaction, runs: number): boolean =>
	interaction.limit !== undefined && runs >= interaction.limit

export interface Resolution {
	/** The first interaction whose conditions all pass. */
	run?: Interaction
	/** The ones tried before it (or all of them, when none ran). */
	failed: Interaction[]
}

/** Picks the interaction to run: the first whose conditions all pass. */
export const resolveInteraction = (
	candidates: Interaction[],
	conditionPasses: (condition: Condition) => boolean,
): Resolution => {
	const failed: Interaction[] = []
	for (const interaction of candidates) {
		if ((interaction.conditions ?? []).every(conditionPasses)) {
			return { run: interaction, failed }
		}
		failed.push(interaction)
	}
	return { failed }
}

/**
 * What to tell the player when nothing ran (DATA-MODEL 4.7): one failing
 * interaction shows its `hint`; several show the object's description.
 * TODO [Game 5]: the default text built from the missing requirements.
 */
export const failureMessage = (
	failed: Interaction[],
	def: PlacedDef | undefined,
): string | undefined =>
	failed.length === 1
		? failed[0].hint
		: failed.length > 1
			? def?.description
			: undefined
