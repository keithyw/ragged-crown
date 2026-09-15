import type { CommandResult } from '@/types'
import { Command } from '@/engine/commands'

export class GiveItemCommand extends Command {
	private itemId: string
	private amount: number

	constructor(data: Record<string, unknown>) {
		super(data)
		this.itemId = data.itemId as string
		this.amount = data.amount as number
	}

	execute(): CommandResult {
		// 1. Perform unit of work (e.g., mutate inventory store)
		console.log(`[Inventory] Added ${this.amount}x ${this.itemId}`)

		// 2. Output result payload to the pipe for subsequent commands
		return {
			success: true,
			data: {
				grantedItemId: this.itemId,
				grantedAmount: this.amount,
			},
		}
	}
}
