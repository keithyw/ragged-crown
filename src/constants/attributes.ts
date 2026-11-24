/**
 * What an attribute's value does in combat, one object per attribute with its
 * own subfields ([Attributes 1]; strength and speed follow in [Attributes 2]
 * and [Attributes 3]).
 *
 * A table is a list of `[min, modifier]` steps in ascending order: a value
 * takes the modifier of the highest step whose `min` it reaches, and a value
 * below the first step takes the first modifier. Attributes have no ceiling,
 * so the last step covers everything above it.
 *
 * The numbers are starting guesses to be tuned by playing. Penalties at the
 * low end stay small so a starting party survives but still feels like farm
 * boys; bonuses start at 12 and grow toward 18.
 */
export type ModifierTable = readonly (readonly [
	min: number,
	modifier: number,
])[]

/**
 * The one table dexterity's defense, strength's damage and constitution's hit
 * points share (owner, 2026-11-23). They are separate entries below, so any can
 * be given its own numbers later.
 */
const SCORE_BONUS: ModifierTable = [
	[1, -2], // 1-3
	[4, -1], // 4-6
	[7, 0], // 7-11 (10 is the starting value)
	[12, 1], // 12-14
	[15, 2], // 15-16
	[17, 3], // 17
	[18, 4], // 18 and up
]

export const ATTRIBUTE_EFFECTS = {
	strength: {
		/** Added to a party attack's damage ([Attributes 2]). */
		damage: SCORE_BONUS,
	},
	constitution: {
		/** Added to a character's flat starting hit points ([Attributes 4]). */
		hp: SCORE_BONUS,
	},
	dexterity: {
		/** Added to a character's defense rating ([Attributes 1]). */
		defense: SCORE_BONUS,
	},
} as const satisfies Record<string, Record<string, ModifierTable>>
