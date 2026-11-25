// src/types/combat.ts
export type CombatPhase =
	'INIT' | 'PLANNING' | 'CONFIRMATION' | 'EXECUTING' | 'POST_COMBAT'
export type PlanningSubPhase =
	'ACTION_SELECT' | 'TARGET_SELECT' | 'SPELL_SELECT'

export type CombatActionType = 'ATTACK' | 'DEFEND' | 'CAST_SPELL'

export interface SelectedTarget {
	type: 'MONSTER_GROUP' | 'PARTY_MEMBER'
	index: number
}

export interface QueuedAction {
	actorId: string
	actionType: CombatActionType
	target?: SelectedTarget
	spellId?: string
}

/**
 * What the party earned from a won encounter, for the post-combat popup
 * ([Game 28]). Loot and gold join it when they exist.
 */
export interface CombatGains {
	/** What each surviving character received ([Combat 15]). */
	xpEach: number
	/** The characters who received it. */
	recipients: string[]
}
