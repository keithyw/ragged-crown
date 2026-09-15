import type { CommandResult } from '@/types'
import { Command } from './Command'

export class PopStackCommand extends Command {
	execute(): CommandResult {
		if (this.ctx) {
			this.ctx.flags.popTopTile = true
		}
		return { success: true }
	}
}
