export interface GameTime {
	year: number
	month: number
	day: number
}

export type CharacterSheetContext = 'GUILD' | 'WORLD' | 'COMBAT'

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST'

export type GameScreen =
	| 'INTRO'
	| 'MAIN_MENU'
	| 'CHARACTER_CREATION'
	| 'CHARACTER_SHEET'
	| 'PARTY_ROSTER'
	| 'SETTINGS'
	| 'WORLD_MAP'
	| 'COMBAT'
	| 'COMBAT_PLANNING'
	| 'CUT_SCENE'

/** The "get" command's prompts ([Game ?]): a direction (or Space for the player's own cell), then which character takes the item. */
export type GetPrompt =
	{ step: 'direction' } | { step: 'character'; pos: { x: number; y: number } }

/** The "open" command's prompts ([Game 18]): first a direction, then, when the target needs one, a character. */
export type OpenPrompt =
	{ step: 'direction' } | { step: 'character'; pos: { x: number; y: number } }
