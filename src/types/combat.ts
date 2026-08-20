// import type { PlayerCharacter } from '@/types'

export type CombatActionType = 'ATTACK' | 'DEFEND' | 'CAST_SPELL' | 'RUN'

export interface SelectedTarget {
	type: 'MONSTER_GROUP' | 'SINGLE_PARTY_MEMBER' | 'ALL_PARTY' | 'ALL_ENEMIES'
	id: string // e.g. group index or character ID
}

export interface QueuedAction {
	actorId: string
	actorType: 'PARTY' | 'MONSTER'
	actionType: CombatActionType
	target?: SelectedTarget
	spellId?: string
}

export type CombatPhase = 'INIT' | 'PLANNING' | 'CONFIRMATION'

// | 'ACTION_SELECT' // Choosing Attack, Defend, Spell, etc.
// | 'TARGET_SELECT' // Choosing target group/PC
// | 'SPELL_SELECT' // Choosing spell from spellbook
// | 'ROUND_CONFIRM' // Reviewing round actions before execution
// | 'EXECUTING_ROUND' // Playing back action logs
// | 'POST_COMBAT' // Loot/XP summary placeholder

export interface ActiveCombatState {
	round: number
	phase: CombatPhase
	currentActorIndex: number // Index of PC currently choosing an action
	actionQueue: QueuedAction[]
	combatLog: string[]
}
