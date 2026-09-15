export interface CommandResult {
	success: boolean
	stopPipeline?: boolean
	data?: Record<string, unknown> // Passed to next command via lastResult
}

export interface PipelineContext {
	// Read/Write access to current world snapshot
	currentZoneId: string
	playerPos: { x: number; y: number }
	result?: CommandResult
	// Mutable flags for top-level engine actions
	flags: {
		popTopTile?: boolean
		zoneTransition?: { zoneId: string; pos?: { x: number; y: number } }
	}
}

export interface ICommand {
	execute(): CommandResult
	setContext(ctx: PipelineContext): void
}
