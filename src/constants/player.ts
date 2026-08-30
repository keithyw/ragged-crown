import type { Attributes } from '@/types'

export const SAVED_GAMES_KEY = 'crpg_saved_games_v1'
export const STORAGE_KEY = 'crpg_created_characters_v1'

export const STARTING_POOL = 10
export const DEFAULT_STAT = 10
export const DEFAULT_HP = 6
export const DEFAULT_SP = 0
export const MIN_STAT = 1
export const MAX_STAT = 18

export const DEFAULT_ATTRIBUTES: Attributes = {
	strength: DEFAULT_STAT,
	dexterity: DEFAULT_STAT,
	intelligence: DEFAULT_STAT,
	wisdom: DEFAULT_STAT,
	personality: DEFAULT_STAT,
	speed: DEFAULT_STAT,
	constitution: DEFAULT_STAT,
}

export const STR_DESC =
	'Determines physical damage bonus and carrying capacity.'
export const DEX_DESC = 'Influences accuracy, ranged attacks, and evasion rate.'
export const INT_DESC =
	'Determines maximum spell points and magic power for arcane spells.'
export const WIS_DESC = 'Enhances divine magic efficacy and magic resistance.'
export const PER_DESC =
	'Affects merchant pricing, NPC interactions, and party leadership.'
export const SPD_DESC =
	'Determines turn order priority in combat and movement rate.'
export const CON_DESC = 'Increases maximum health points gained per level.'
