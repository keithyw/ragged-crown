import type { ActionPayload, ICommand } from '@/types'
import {
	GiveItemCommand,
	PopStackCommand,
	ShowDialogCommand,
} from '@/engine/commands'

export class CommandFactory {
	static create(action: ActionPayload): ICommand | null {
		switch (action.type) {
			case 'GIVE_ITEM':
				return new GiveItemCommand({ itemId: action.itemId, amount: 1 })
			case 'POP_STACK':
				return new PopStackCommand({})
			case 'SHOW_DIALOG':
				return new ShowDialogCommand({ text: action.text || action.dialogKey! })
			default:
				console.warn(`Unhandled action type: ${action.type}`)
				return null
		}
	}
}
