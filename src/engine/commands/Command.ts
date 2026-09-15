import type { ICommand, PipelineContext, CommandResult } from '@/types'

export abstract class Command implements ICommand {
	protected ctx?: PipelineContext
	private data: Record<string, unknown>

	constructor(data: Record<string, unknown>) {
		this.data = data
	}

	public getData(): Record<string, unknown> {
		return this.data
	}

	public setContext(ctx: PipelineContext): void {
		this.ctx = ctx
	}

	public abstract execute(): CommandResult
}
