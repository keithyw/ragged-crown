export type KeyHandler = (key: string, event: KeyboardEvent) => boolean | void

export class InputManager {
	private activeHandlers: Set<KeyHandler> = new Set()

	public attachListeners(): void {
		window.addEventListener('keydown', this.handleKeyDown)
	}

	public detachListeners(): void {
		window.removeEventListener('keydown', this.handleKeyDown)
	}

	public registerHandler(handler: KeyHandler): () => void {
		this.activeHandlers.add(handler)
		return () => {
			this.activeHandlers.delete(handler)
		}
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.repeat) return

		// Run backwards through registered handlers (top of stack/latest first)
		const handlers = Array.from(this.activeHandlers).reverse()
		for (const handler of handlers) {
			const handled = handler(event.key, event)
			if (handled) break
		}
	}
}

export const inputManager = new InputManager()
