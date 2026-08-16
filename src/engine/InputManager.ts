import type { CommandBus } from '@/engine'
import type { Command, GameScreen } from '@/types'

type KeyBindingMap = Record<string, () => Command | null>

export class InputManager {
	private bus: CommandBus
	private currentContext: GameScreen = 'WORLD_MAP'
	private keyMaps: Record<GameScreen, KeyBindingMap>

	constructor(bus: CommandBus) {
		this.bus = bus
		this.keyMaps = {
			INTRO: {
				' ': () => ({ type: 'START_GAME' }),
				Enter: () => ({ type: 'START_GAME' }),
			},
			MAIN_MENU: {},
			CHARACTER_CREATION: {},
			SETTINGS: {},
			WORLD_MAP: {
				w: () => ({ type: 'MOVE_PLAYER', payload: { dx: 0, dy: -1 } }),
				ArrowUp: () => ({ type: 'MOVE_PLAYER', payload: { dx: 0, dy: -1 } }),
				s: () => ({ type: 'MOVE_PLAYER', payload: { dx: 0, dy: 1 } }),
				ArrowDown: () => ({ type: 'MOVE_PLAYER', payload: { dx: 0, dy: 1 } }),
				a: () => ({ type: 'MOVE_PLAYER', payload: { dx: -1, dy: 0 } }),
				ArrowLeft: () => ({ type: 'MOVE_PLAYER', payload: { dx: -1, dy: 0 } }),
				d: () => ({ type: 'MOVE_PLAYER', payload: { dx: 1, dy: 0 } }),
				ArrowRight: () => ({ type: 'MOVE_PLAYER', payload: { dx: 1, dy: 0 } }),
				e: () => ({ type: 'INTERACT' }),
			},
			COMBAT: {
				a: () => ({ type: 'COMBAT_ATTACK' }),
				d: () => ({ type: 'COMBAT_DEFEND' }),
				c: () => ({ type: 'COMBAT_CAST_SPELL' }),
				f: () => ({ type: 'COMBAT_FLEE' }),
			},
			DIALOGUE: {
				'1': () => ({ type: 'SELECT_OPTION', payload: { optionIndex: 0 } }),
				'2': () => ({ type: 'SELECT_OPTION', payload: { optionIndex: 1 } }),
				Escape: () => ({ type: 'CLOSE_DIALOGUE' }),
			},
		}
	}

	public setContext(context: GameScreen): void {
		this.currentContext = context
	}

	public attachListeners(): void {
		window.removeEventListener('keydown', this.handleKeyDown)
		window.addEventListener('keydown', this.handleKeyDown)
	}

	public detachListeners(): void {
		window.removeEventListener('keydown', this.handleKeyDown)
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		const keyMap = this.keyMaps[this.currentContext]
		if (!keyMap) return

		const action = keyMap[event.key] || keyMap[event.key.toLowerCase()]
		if (action) {
			const command = action()
			if (command) {
				event.preventDefault()
				this.bus.dispatch(command)
			}
		}
	}
}
