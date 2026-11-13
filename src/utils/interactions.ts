import type {
	Condition,
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
