import type { Currency, ItemDef } from '@shared/types'
import { CURRENCIES } from '@/constants'
import type { PlayerCharacter } from '@/types'

/**
 * The currency a def is a coin of: an `isCurrency` item, named by its `id`
 * (`GOLD` is gold, tools DATA-MODEL.md section 8). Undefined for anything else.
 */
export const currencyOf = (
	def: Pick<ItemDef, 'id' | 'isCurrency'>,
): Currency | undefined =>
	def.isCurrency
		? CURRENCIES.find((c) => c === def.id?.toLowerCase())
		: undefined

export const addCurrency = (
	character: PlayerCharacter,
	currency: Currency,
	amount: number,
): PlayerCharacter => ({
	...character,
	currency: {
		...character.currency,
		[currency]: (character.currency?.[currency] ?? 0) + amount,
	},
})

/** The currencies a character holds at least one of, lowest first. */
export const heldCurrencies = (character: PlayerCharacter): Currency[] =>
	CURRENCIES.filter((c) => (character.currency?.[c] ?? 0) > 0)

/**
 * The party with everyone's currency moved onto one member ([Currency 11]).
 * Each currency stays its own; nothing is converted.
 */
export const gatherCurrency = (
	party: PlayerCharacter[],
	id: string,
): PlayerCharacter[] =>
	party.map((member) => {
		if (member.id !== id) return { ...member, currency: {} }
		let gathered = member
		for (const other of party) {
			if (other.id === id) continue
			for (const c of heldCurrencies(other)) {
				gathered = addCurrency(gathered, c, other.currency?.[c] ?? 0)
			}
		}
		return gathered
	})
