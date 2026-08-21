import { inputManager } from '@/engine'
import { useGameStore } from '@/store/useGameStore'
import {
	SpellCaster,
	type CombatActionType,
	type PlanningSubPhase,
	type QueuedAction,
} from '@/types'

export class CombatEngine {
	private unbindInput?: () => void
	private onExitCombat?: () => void

	private subPhase: PlanningSubPhase = 'ACTION_SELECT'
	private pendingActionType: CombatActionType | null = null

	public enterCombat(onExitCombat?: () => void): void {
		if (onExitCombat) {
			this.onExitCombat = onExitCombat
		}
		const store = useGameStore.getState()
		store.setCombatPhase('INIT')
		store.setActiveCharacter(0)
		store.clearActionQueue()

		this.bindInitInputs()
	}

	public startPlanning(): void {
		const store = useGameStore.getState()
		store.setCombatPhase('PLANNING')
		this.subPhase = 'ACTION_SELECT'
		this.bindPlanningInputs()
	}

	private bindInitInputs(): void {
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()
			if (k === 'f') {
				this.startPlanning()
				return true
			}
			if (k === 'r') {
				this.flee()
				return true
			}
			return false
		})
	}

	private bindPlanningInputs(): void {
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === 'Backspace') {
				this.resetPlanning()
				return true
			}

			if (this.subPhase === 'ACTION_SELECT') {
				return this.handleActionSelectInput(key.toLowerCase())
			}

			if (this.subPhase === 'TARGET_SELECT') {
				return this.handleTargetSelectInput(key)
			}

			return false
		})
	}

	public handleActionSelectInput(key: string): boolean {
		const store = useGameStore.getState()
		const party = store.party
		const activeIndex = store.activeCharacter
		const currentChar = party[activeIndex]
		if (!currentChar) return false

		if (key === 'a') {
			this.queueOrPromptTarget('ATTACK')
			return true
		}
		if (key === 'd') {
			this.commitAction('DEFEND')
			return true
		}
		if (key === 'c') {
			if (SpellCaster.includes(currentChar.class as string)) {
				this.queueOrPromptTarget('CAST_SPELL')
				return true
			}
		}
		return false
	}

	private queueOrPromptTarget(actionType: CombatActionType): void {
		const store = useGameStore.getState()
		const encounter = store.encounter
		if (!encounter) return

		// Single target group automatically commits target index 0
		if (encounter.groups.length <= 1) {
			this.commitAction(actionType, 0)
		} else {
			this.pendingActionType = actionType
			this.subPhase = 'TARGET_SELECT'
			store.addLog(`> Select Target Group [1-${encounter.groups.length}]`)
		}
	}

	private handleTargetSelectInput(key: string): boolean {
		if (key === 'Escape') {
			this.subPhase = 'ACTION_SELECT'
			this.pendingActionType = null
			useGameStore.getState().addLog('> Target selection cancelled.')
			return true
		}

		const groupIndex = Number(key) - 1
		const encounter = useGameStore.getState().encounter
		if (
			!isNaN(groupIndex) &&
			encounter &&
			groupIndex >= 0 &&
			groupIndex < encounter.groups.length
		) {
			if (this.pendingActionType) {
				this.commitAction(this.pendingActionType, groupIndex)
			}
			return true
		}
		return false
	}

	private commitAction(
		actionType: CombatActionType,
		targetGroupIndex?: number,
	): void {
		const store = useGameStore.getState()
		const party = store.party
		const currentChar = party[store.activeCharacter]
		if (!currentChar) return

		const action: QueuedAction = {
			actorId: currentChar.id,
			actionType,
			...(targetGroupIndex !== undefined && {
				target: { type: 'MONSTER_GROUP', index: targetGroupIndex },
			}),
		}

		store.queueAction(action)
		store.addLog(`> ${currentChar.name} queued: ${actionType}`)

		// Reset internal sub-state for next actor
		this.subPhase = 'ACTION_SELECT'
		this.pendingActionType = null

		// Advance actor or finish planning phase
		const nextIndex = store.activeCharacter + 1
		if (nextIndex < party.length) {
			store.setActiveCharacter(nextIndex)
		} else {
			store.setCombatPhase('CONFIRMATION')
			this.bindConfirmationInputs()
		}
	}

	private bindConfirmationInputs(): void {
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === 'Enter') {
				this.executeRound()
				return true
			}
			if (key === 'Backspace') {
				this.resetPlanning()
				return true
			}
			return false
		})
	}

	public resetPlanning(): void {
		const store = useGameStore.getState()
		store.clearActionQueue()
		store.setActiveCharacter(0)
		store.addLog('> Planning phase reset.')
		this.startPlanning()
	}

	public executeRound(): void {
		const store = useGameStore.getState()
		store.setCombatPhase('EXECUTING')
		store.addLog('> Round executing...')
		// Future turn resolution loop will run here
	}

	public flee(): void {
		const store = useGameStore.getState()
		this.cleanup()
		store.setEncounter(null)
		store.setScreen('WORLD_MAP')
		store.addLog('> You fled from combat!')
		this.onExitCombat?.()
	}

	public cleanup(): void {
		this.unbindInput?.()
	}
}

export const combatEngine = new CombatEngine()
