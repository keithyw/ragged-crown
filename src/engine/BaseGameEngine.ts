export abstract class BaseGameEngine {
	protected isRunning: boolean = false

	// The Template Method: Enforces execution order
	public async initialize(): Promise<void> {
		await this.loadAssets()
		this.setupState()
		this.registerCommandHandlers()
		this.onInitialized()
		this.startLoop()
	}

	// Lifecycle Hooks (to be implemented by concrete engines)
	protected abstract loadAssets(): Promise<void>
	protected abstract setupState(): void
	protected abstract registerCommandHandlers(): void
	protected abstract update(deltaTime: number): void
	protected onInitialized(): void {}

	protected startLoop(): void {
		this.isRunning = true
		let lastTime = performance.now()

		const loop = (currentTime: number) => {
			if (!this.isRunning) return
			const deltaTime = (currentTime - lastTime) / 1000
			lastTime = currentTime

			this.update(deltaTime)
			requestAnimationFrame(loop)
		}

		requestAnimationFrame(loop)
	}

	public shutdown(): void {
		this.isRunning = false
	}
}
