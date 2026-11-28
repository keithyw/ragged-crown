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
