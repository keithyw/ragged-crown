import type { Currency } from '@shared/types'

// A copy of the tools' lib/constants/currency.ts ([Currency 3]). The shared
// types are types-only, so the values can't be imported (CLAUDE.md, "Shared
// types"). Keep them in step with the tools.

// What one coin is worth in bronze, the smallest, so every value is a whole
// number. Lowest to highest.
export const CURRENCY_VALUES: Record<Currency, number> = {
	bronze: 1,
	copper: 5,
	iron: 25,
	silver: 50,
	gold: 500,
	platinum: 1500,
}

export const CURRENCIES = Object.keys(CURRENCY_VALUES) as Currency[]
