import { inputManager } from '@/engine'
import { useGameStore } from '@/store/useGameStore'
import {
	SpellCaster,
	type ActiveEncounter,
	type ActiveMonster,
	type CombatActionType,
	type Monster,
	type MonsterGroup,
	type PlanningSubPhase,
	type QueuedAction,
	type TileDef,
	type Zone,
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

	public createMonsterGroup(
		monsterTemplate: Monster,
		count: number,
		inMeleeRange: boolean,
	): MonsterGroup {
		const monsters: ActiveMonster[] = []

		for (let i = 0; i < count; i++) {
			// Future: Evaluate variable HP roll (e.g. 1d6) here
			const hpValue = monsterTemplate.maxHp || 8

			monsters.push({
				id: `${monsterTemplate.id}-${Date.now()}-${i}`,
				templateId: monsterTemplate.id,
				name: `${monsterTemplate.name} #${i + 1}`,
				hp: {
					current: hpValue,
					max: hpValue,
				},
			})
		}

		return {
			id: `group-${monsterTemplate.id}`,
			name: monsterTemplate.name,
			count: monsters.length,
			inMeleeRange,
			monsters,
		}
	}

	public generateEncounter(zone: Zone, tile: TileDef): ActiveEncounter {
		const store = useGameStore.getState()
		const monsterTemplates = store.monsters
		console.log('monsterTemplates', monsterTemplates)

		// need to eventually convert this into something that uses
		// a category based system
		const isRoad = tile.name.toLowerCase().includes('road')
		const primaryDefId = isRoad ? 'bandit' : 'goblin'
		const primaryCount = isRoad
			? Math.floor(Math.random() * 3) + 1
			: Math.floor(Math.random() * 4) + 1

		const groups: MonsterGroup[] = []

		// Instantiate primary group
		const monster = monsterTemplates.find((m) => m.id === primaryDefId)
		const primaryGroup = this.createMonsterGroup(
			monster as Monster,
			primaryCount,
			true,
		)
		if (primaryGroup) groups.push(primaryGroup)

		// 30% chance for secondary ranged group
		if (Math.random() < 0.3) {
			const secondMonster = monsterTemplates.find(
				(m) => m.id === 'giant_spider',
			)
			const secondaryGroup = this.createMonsterGroup(
				secondMonster as Monster,
				Math.floor(Math.random() * 2) + 1,
				false,
			)
			if (secondaryGroup) groups.push(secondaryGroup)
		}

		return {
			id: `enc-${Date.now()}`,
			zoneId: zone.id,
			dangerLevel: zone.dangerLevel,
			groups,
			phase: 'INIT',
		}
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

	private resolvePartyAttack(
		actorName: string,
		targetGroupIndex: number,
	): void {
		const store = useGameStore.getState()
		const encounter = store.encounter
		if (!encounter || !encounter.groups[targetGroupIndex]) return

		const targetGroup = encounter.groups[targetGroupIndex]

		const targetMonster = targetGroup.monsters.find((m) => m.hp.current > 0)

		if (!targetMonster) {
			store.addLog(
				`> ${actorName} attacks ${targetGroup.name}, but no targets remain!`,
			)
			return
		}

		// Placeholder combat calculation: 1d6 + 2 damage
		const damage = Math.floor(Math.random() * 6) + 3
		targetMonster.hp.current = Math.max(0, targetMonster.hp.current - damage)
		store.addLog(
			`> ${actorName} attacks ${targetGroup.name} for ${damage} damage!`,
		)

		if (targetMonster.hp.current <= 0) {
			store.addLog(`> ${targetMonster.name} is defeated!`)
		}

		store.setEncounter({ ...encounter })
	}

	private resolveMonsterAttack(): void {
		const store = useGameStore.getState()
		const encounter = store.encounter
		if (!encounter) return

		const monsters = encounter.groups.flatMap((g) =>
			g.monsters.filter((m) => m.hp.current > 0),
		)

		for (const m of monsters) {
			const party = store.party
			const livingMembers = party.filter((p) => p.hp.current > 0)
			if (livingMembers.length === 0) break
			const target =
				livingMembers[Math.floor(Math.random() * livingMembers.length)]
			const damage = Math.floor(Math.random() * 4) + 1

			store.addLog(`> ${m.name} hits ${target.name} for ${damage} damage!`)
			store.damageCharacter(target.id, damage)

			if (target.hp.current - damage <= 0) {
				store.addLog(`> ${target.name} is killed by ${m.name}!`)
			}
		}
	}

	private transitionToPostCombat(): void {
		// const store = useGameStore.getState()
		// store.setScreen('POST_COMBAT')
	}

	private evaluateCombatOutcome(): void {
		const store = useGameStore.getState()
		const encounter = store.encounter

		// Check Victory
		const allEnemiesDefeated = encounter?.groups.every((g) =>
			g.monsters.every((m) => m.hp.current <= 0),
		)
		if (allEnemiesDefeated) {
			store.addLog('> Victory! All enemies defeated.')
			// need function
			// this.finishCombatVictory()
			this.transitionToPostCombat()
			return
		}

		// Check Wipe
		const partyWiped = store.party.every((p) => p.hp.current <= 0)
		if (partyWiped) {
			store.addLog('> Your party has fallen... Game Over.')
			return
		}

		// Continue to next round
		store.clearActionQueue()
		store.setActiveCharacter(0)
		this.startPlanning()
	}

	public executeRound(): void {
		const store = useGameStore.getState()
		store.setCombatPhase('EXECUTING')
		store.addLog('> Round executing...')
		const queue = store.actionQueue

		// 1. Resolve Party Queued Actions in Order
		// move into function
		for (const action of queue) {
			const actor = store.party.find((p) => p.id === action.actorId)
			if (!actor || actor.hp.current <= 0) continue // Skip if downed

			if (action.actionType === 'ATTACK') {
				const targetIdx = action.target?.index ?? 0
				this.resolvePartyAttack(actor.name, targetIdx)
			} else if (action.actionType === 'DEFEND') {
				store.addLog(`> ${actor.name} takes a defensive stance!`)
			} else if (action.actionType === 'CAST_SPELL') {
				store.addLog(`> ${actor.name} weaves a spell!`)
			}
		}

		// 2. Resolve Monster Group Counter-Attacks
		this.resolveMonsterAttack()

		// 3. Round Cleanup & Transition Check
		this.evaluateCombatOutcome()
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
