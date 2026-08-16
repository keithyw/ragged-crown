import type { CommandType, Command, CommandHandler } from '@/types'

export class CommandBus {
	private handlers: Map<CommandType, CommandHandler[]> = new Map()

	public subscribe(type: CommandType, handler: CommandHandler): () => void {
		if (!this.handlers.has(type)) {
			this.handlers.set(type, [])
		}
		this.handlers.get(type)!.push(handler)

		// Unsubscribe cleanup
		return () => {
			const list = this.handlers.get(type) || []
			this.handlers.set(
				type,
				list.filter((h) => h !== handler),
			)
		}
	}

	public dispatch(command: Command): void {
		const list = this.handlers.get(command.type) || []
		list.forEach((handler) => handler(command))
	}
}
