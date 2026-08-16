export type CommandType =
	| 'MOVE_PLAYER'
	| 'INTERACT'
	| 'OPEN_INVENTORY'
	| 'EXECUTE_ATTACK'
	| 'CAST_SPELL'
	| 'START_GAME'
	| 'COMBAT_ATTACK'
	| 'COMBAT_DEFEND'
	| 'COMBAT_CAST_SPELL'
	| 'COMBAT_FLEE'
	| 'SELECT_OPTION'
	| 'CLOSE_DIALOGUE'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Command<T = any> {
	type: CommandType
	payload?: T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CommandHandler<T = any> = (command: Command<T>) => void
