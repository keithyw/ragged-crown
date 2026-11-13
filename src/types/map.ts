export interface Position {
	x: number
	y: number
}
// TODO [Game 2]: the old interaction types below are replaced by the shared
// `Interaction`, `Condition` and `Action` unions when the interaction engine is ported.
export type InteractionType =
	| 'WALK'
	| 'TALK'
	| 'PICKUP'
	| 'DROP'
	| 'USE'
	| 'OPEN'
	| 'CLOSE'
	| 'BUMP_INTERACT'

export type ActionType =
	| 'GIVE_ITEM'
	| 'PLAY_SOUND'
	| 'SHOW_DIALOG'
	| 'SET_FLAG'
	| 'SPAWN_OBJECT'
	| 'MODIFY_ATTRIBUTE'
	| 'POP_STACK'

export interface ActionPayload {
	amount?: number
	dialogKey?: string
	flagName?: string
	itemId?: string
	popOnComplete?: boolean
	targetZone?: string
	targetPos?: Position
	soundEffect?: string
	spawnTileId?: string
	text?: string
	type: ActionType
	triggerOn: InteractionType
}
