import type { CommandResult } from '@/types'
import { Command } from './Command'

export class ShowDialogCommand extends Command {
	private text: string

	constructor(data: Record<string, unknown>) {
		super(data)
		this.text = data.text as string
	}

	execute(): CommandResult {
		let outputText = this.text

		if (this?.ctx?.result?.data?.grantedItemId) {
			outputText = outputText.replace(
				'{item}',
				`${this.ctx.result?.data.grantedAmount}x ${this.ctx.result?.data.grantedItemId}`,
			)
		}

		console.log(`[Dialog]: ${outputText}`)
		return { success: true }
	}
}
