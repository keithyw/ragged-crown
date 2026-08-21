// src/types/combat.ts
export type CombatPhase = 'INIT' | 'PLANNING' | 'CONFIRMATION' | 'EXECUTING'
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
