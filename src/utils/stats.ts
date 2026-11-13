import type { Action, CharacterStat } from '@shared/types'
import type { Attributes, PlayerCharacter } from '@/types'

export type ModifyAttribute = Extract<Action, { type: 'MODIFY_ATTRIBUTE' }>

const ATTRIBUTES: readonly CharacterStat[] = [
	'strength',
	'dexterity',
	'intelligence',
	'wisdom',
	'personality',
	'speed',
	'constitution',
]

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value))

export interface StatChange {
	character: PlayerCharacter
	/** One line for the event log. */
	message: string
}

/**
 * Applies a MODIFY_ATTRIBUTE to one character without mutating it
 * (DATA-MODEL 4.4). Permanent changes only. Returns undefined for the stats
 * the game has no home for yet: `xp` and `level` (decided in [Game 5]).
 */
export const applyStatChange = (
	character: PlayerCharacter,
	action: ModifyAttribute,
): StatChange | undefined => {
	const { attribute, amount } = action
	const name = character.name

	if (attribute === 'hp' || attribute === 'sp') {
		const label = attribute.toUpperCase()
		const bar = character[attribute]
		if (action.bar === 'max') {
			// A bigger (or smaller) maximum moves the current value with it.
			const max = Math.max(1, bar.max + amount)
			const current = clamp(bar.current + amount, 0, max)
			return {
				character: { ...character, [attribute]: { current, max } },
				message: `${name}'s max ${label} ${amount >= 0 ? 'rises' : 'falls'} by ${Math.abs(amount)}.`,
			}
		}
		const current = clamp(bar.current + amount, 0, bar.max)
		const applied = current - bar.current
		return {
			character: { ...character, [attribute]: { ...bar, current } },
			message:
				applied === 0
					? `${name} feels no different.`
					: `${name} ${applied > 0 ? 'recovers' : 'loses'} ${Math.abs(applied)} ${label}.`,
		}
	}

	if (ATTRIBUTES.includes(attribute)) {
		const key = attribute as keyof Attributes
		const value = Math.max(0, character.attributes[key] + amount)
		return {
			character: {
				...character,
				attributes: { ...character.attributes, [key]: value },
			},
			message: `${name}'s ${attribute} ${amount >= 0 ? 'rises' : 'falls'} by ${Math.abs(amount)}.`,
		}
	}

	return undefined
}
