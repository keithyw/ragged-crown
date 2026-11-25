import { BASE_INITIATIVE } from '@/constants'
import { inputManager } from '@/engine'
import { useContentStore } from '@/store/useContentStore'
import { useGameStore } from '@/store/useGameStore'
import { zoneLoaderService } from '@/services/ZoneLoaderService'
import {
	SpellCaster,
	type ActiveEncounter,
	type ActiveMonster,
	type CombatActionType,
	type MonsterGroup,
	type PlayerCharacter,
	type QueuedAction,
} from '@/types'
import {
	attackProfile,
	encounterXp,
	initiativeRating,
	mitigate,
	xpShare,
} from '@/utils/combat'
import { defenseRating } from '@/utils/equipment'
import { isDown, withStatus } from '@/utils/status'
import { qualifiedName } from '@/utils/qualifiers'
import type { EncounterGroup, MonsterDef, TileDef, Zone } from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'

export class CombatEngine {
	private unbindInput?: () => void
	private onExitCombat?: (outcome: 'won' | 'fled') => void

	private pendingActionType: CombatActionType | null = null

	public enterCombat(onExitCombat?: (outcome: 'won' | 'fled') => void): void {
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
		store.setSubPhase('ACTION_SELECT')
		store.setSelectedTargetIndex(-1)
		// A downed character gets no turn: start at the first one still up.
		const first = store.party.findIndex(
			(p, i) => i >= store.activeCharacter && !isDown(p),
		)
		if (first >= 0) store.setActiveCharacter(first)
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
		const store = useGameStore.getState()
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === 'Backspace') {
				this.resetPlanning()
				return true
			}

			if (store.subPhase === 'ACTION_SELECT') {
				return this.handleActionSelectInput(key.toLowerCase())
			}

			if (store.subPhase === 'TARGET_SELECT') {
				return this.handleTargetSelectInput(key)
			}

			return false
		})
	}

	public bindTargetSelectInput(monsterGroup: number[]): void {
		let pos = 0
		const store = useGameStore.getState()
		store.setSelectedTargetIndex(monsterGroup[pos])
		this.unbindInput?.()

		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === 'ArrowUp') {
				pos = (pos - 1 + monsterGroup.length) % monsterGroup.length
				store.setSelectedTargetIndex(monsterGroup[pos])
				return true
			}
			if (key === 'ArrowDown') {
				pos = (pos + 1) % monsterGroup.length
				store.setSelectedTargetIndex(monsterGroup[pos])
				return true
			}
			if (key === 'Enter') {
				if (this.pendingActionType) {
					this.commitAction(this.pendingActionType, monsterGroup[pos])
				}
				return true
			}
			if (key === 'Escape') {
				this.cancelTargetSelection()
				return true
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
			const monsterGroups = encounter.groups
				.map((g, idx) => (g.monsters.some((m) => !isDown(m)) ? idx : -1))
				.filter((idx) => idx !== -1)
			if (monsterGroups.length === 0) return

			this.pendingActionType = actionType
			store.setSubPhase('TARGET_SELECT')
			store.setSelectedTargetIndex(monsterGroups[0])
			store.addLog(`> Select Target Group [1-${encounter.groups.length}]`)
			this.bindTargetSelectInput(monsterGroups)
		}
	}

	private handleTargetSelectInput(key: string): boolean {
		const store = useGameStore.getState()
		if (key === 'Escape') {
			store.setSubPhase('ACTION_SELECT')
			this.pendingActionType = null
			store.addLog('> Target selection cancelled.')
			return true
		}

		const groupIndex = Number(key) - 1
		const encounter = store.encounter
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
		monsterTemplate: StoredDoc<MonsterDef>,
		count: number,
		inMeleeRange: boolean,
	): MonsterGroup {
		const monsters: ActiveMonster[] = []

		for (let i = 0; i < count; i++) {
			const hpValue = monsterTemplate.hp

			monsters.push({
				id: `${monsterTemplate.id}-${Date.now()}-${i}`,
				templateId: monsterTemplate._id,
				name: `${monsterTemplate.name} #${i + 1}`,
				hp: {
					current: hpValue,
					max: hpValue,
				},
				statuses: [],
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
		// Still the hard-coded groups; the pool comes from the difficulty
		// configuration in [Combat 8]. Defs are found by their user-facing `id`.
		const monsterTemplates = [...useContentStore.getState().monsters.values()]
		const findMonster = (id: string) => {
			const def = monsterTemplates.find((m) => m.id === id)
			if (!def) console.warn(`No monster def with id '${id}'`)
			return def
		}

		// need to eventually convert this into something that uses
		// a category based system
		const isRoad = tile.name.toLowerCase().includes('road')
		const primaryDefId = isRoad ? 'BANDIT' : 'GOBLIN'
		const primaryCount = isRoad
			? Math.floor(Math.random() * 3) + 1
			: Math.floor(Math.random() * 4) + 1

		const groups: MonsterGroup[] = []

		// Instantiate primary group
		const monster = findMonster(primaryDefId)
		if (monster) {
			groups.push(this.createMonsterGroup(monster, primaryCount, true))
		}

		// 30% chance for secondary ranged group
		if (Math.random() < 0.3) {
			const secondMonster = findMonster('GIANT_SPIDER')
			if (secondMonster) {
				groups.push(
					this.createMonsterGroup(
						secondMonster,
						Math.floor(Math.random() * 2) + 1,
						false,
					),
				)
			}
		}

		return {
			id: `enc-${Date.now()}`,
			zoneId: zone.id,
			difficultyLevel: zoneLoaderService.difficultyLevel(zone),
			groups,
			phase: 'INIT',
		}
	}

	/**
	 * A set encounter ([Combat 7]): the placement's monster groups, each in
	 * melee range. A blank count is rolled from the def's numberAppearing; a
	 * unique monster is always one.
	 */
	public buildSetEncounter(
		zone: Zone,
		groups: EncounterGroup[],
	): ActiveEncounter | undefined {
		const defs = useContentStore.getState().monsters
		const built: MonsterGroup[] = []
		for (const g of groups) {
			const def = defs.get(g.defId)
			if (!def) {
				console.warn(`No monster def with _id '${g.defId}'`)
				continue
			}
			let count = g.count
			if (count === undefined) {
				count = 1
				if (!def.isUnique) {
					count = 0
					for (let i = 0; i < def.numberAppearing.count; i++) {
						count += Math.floor(Math.random() * def.numberAppearing.die) + 1
					}
				}
			}
			built.push(this.createMonsterGroup(def, count, true))
		}
		if (built.length === 0) return undefined
		return {
			id: `enc-${Date.now()}`,
			zoneId: zone.id,
			difficultyLevel: zoneLoaderService.difficultyLevel(zone),
			groups: built,
			phase: 'INIT',
		}
	}

	private cancelTargetSelection(): void {
		const store = useGameStore.getState()
		this.pendingActionType = null
		store.setSubPhase('ACTION_SELECT')
		store.setSelectedTargetIndex(-1)
		store.addLog('> Target selection cancelled.')
		this.bindPlanningInputs()
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
		this.pendingActionType = null
		store.setSubPhase('ACTION_SELECT')
		store.setSelectedTargetIndex(-1)

		// Advance actor or finish planning phase
		// Downed characters are skipped.
		const nextIndex = party.findIndex(
			(p, i) => i > store.activeCharacter && !isDown(p),
		)
		if (nextIndex >= 0) {
			store.setActiveCharacter(nextIndex)
			this.bindPlanningInputs()
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
		actor: PlayerCharacter,
		targetGroupIndex: number,
		initiative: number,
	): void {
		const store = useGameStore.getState()
		const encounter = store.encounter
		if (!encounter || !encounter.groups[targetGroupIndex]) return

		const targetGroup = encounter.groups[targetGroupIndex]

		const targetMonster = targetGroup.monsters.find((m) => !isDown(m))

		if (!targetMonster) {
			store.addLog(
				`> [${initiative}] ${actor.name} attacks ${targetGroup.name}, but no targets remain!`,
			)
			return
		}

		// The weapon, quality and strength are worked out in one place, so the
		// character sheet's range matches ([Inventory 46]).
		const { weapon, roll, bonus } = attackProfile(
			actor,
			useContentStore.getState().items,
		)
		let damage = 0
		for (let i = 0; i < roll.count; i++) {
			damage += Math.floor(Math.random() * roll.die) + 1
		}
		// The monster's defense value takes points off the hit ([Combat 16]).
		const defense =
			useContentStore.getState().monsters.get(targetMonster.templateId)
				?.defenseValue ?? 0
		damage = mitigate(Math.max(0, damage + bonus), defense)
		targetMonster.hp.current = Math.max(0, targetMonster.hp.current - damage)
		store.addLog(
			weapon
				? `> [${initiative}] ${actor.name} hits ${targetGroup.name} with ${qualifiedName(weapon.name, weapon.qualifiers)} for ${damage} damage!`
				: `> [${initiative}] ${actor.name} punches ${targetGroup.name} for ${damage} damage!`,
		)

		if (targetMonster.hp.current <= 0) {
			targetMonster.statuses = withStatus(targetMonster.statuses ?? [], 'dead')
			store.addLog(`> ${targetMonster.name} is defeated!`)
		}

		store.setEncounter({ ...encounter })
	}

	private resolveMonsterAttack(m: ActiveMonster, initiative: number): void {
		const store = useGameStore.getState()
		const livingMembers = store.party.filter((p) => !isDown(p))
		if (livingMembers.length === 0) return
		const target =
			livingMembers[Math.floor(Math.random() * livingMembers.length)]
		// The def's base damage ([Monsters 7]); the old flat 1d4 if it is gone.
		const roll = useContentStore.getState().monsters.get(m.templateId)
			?.damage ?? { count: 1, die: 4 }
		let damage = 0
		for (let i = 0; i < roll.count; i++) {
			damage += Math.floor(Math.random() * roll.die) + 1
		}
		// The target's defense rating takes points off the hit ([Combat 16]).
		damage = mitigate(
			damage,
			defenseRating(target, useContentStore.getState().items),
		)

		store.addLog(
			`> [${initiative}] ${m.name} hits ${target.name} for ${damage} damage!`,
		)
		store.damageCharacter(target.id, damage)

		if (target.hp.current - damage <= 0) {
			store.addLog(`> ${target.name} is killed by ${m.name}!`)
		}
	}

	private transitionToPostCombat(): void {
		const store = useGameStore.getState()
		store.setCombatPhase('POST_COMBAT')
		store.addLog('> Victory! All enemies are dead.')
		this.grantXp()
		store.addLog('> Press [ENTER] to return to exploration...')
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === ' ' || key === 'Enter') {
				this.finishCombat()
				return true
			}
			return false
		})
	}

	/**
	 * The encounter's XP, summed over its monsters and divided among the
	 * characters still up; a fallen character gets no share ([Combat 15]).
	 */
	private grantXp(): void {
		const store = useGameStore.getState()
		const total = encounterXp(
			store.encounter,
			useContentStore.getState().monsters,
		)
		const survivors = store.party.filter((p) => !isDown(p))
		const share = xpShare(total, survivors.length)
		if (share === 0) {
			store.setCombatGains({ xpEach: 0, recipients: [] })
			return
		}
		store.setParty(
			store.party.map((p) => (isDown(p) ? p : { ...p, xp: p.xp + share })),
		)
		for (const p of survivors) store.addLog(`> ${p.name} gains ${share} XP.`)
		store.setCombatGains({
			xpEach: share,
			recipients: survivors.map((p) => p.name),
		})
	}

	private evaluateCombatOutcome(): void {
		const store = useGameStore.getState()
		const encounter = store.encounter

		// Check Victory
		const allEnemiesDefeated = encounter?.groups.every((g) =>
			g.monsters.every((m) => isDown(m)),
		)
		if (allEnemiesDefeated) {
			store.addLog('> Victory! All enemies defeated.')
			// need function
			// this.finishCombatVictory()
			this.transitionToPostCombat()
			return
		}

		// Check Wipe
		const partyWiped = store.party.every((p) => isDown(p))
		if (partyWiped) {
			store.addLog('> Your party has fallen... Game Over.')
			return
		}

		// Continue to next round
		store.clearActionQueue()
		store.setActiveCharacter(0)
		this.startPlanning()
	}

	/**
	 * One round in initiative order ([Combat 17]). Everyone still up rolls
	 * their initiative once, highest acts first, and the party wins ties (then
	 * party order, then monster order). Whether someone is still up is checked
	 * on their turn, so one who fell earlier in the round doesn't act.
	 */
	public executeRound(): void {
		const store = useGameStore.getState()
		store.setCombatPhase('EXECUTING')
		store.addLog('> Round executing...')
		const queue = store.actionQueue
		const { items, monsters: monsterDefs } = useContentStore.getState()
		const d6 = () => Math.floor(Math.random() * 6) + 1

		type Turn =
			| { side: 'party'; id: string; initiative: number }
			| { side: 'monster'; monster: ActiveMonster; initiative: number }

		const turns: Turn[] = [
			...store.party
				.filter((p) => !isDown(p))
				.map((p): Turn => ({
					side: 'party',
					id: p.id,
					initiative: initiativeRating(p, items) + d6(),
				})),
			...(store.encounter?.groups ?? []).flatMap((g) =>
				g.monsters
					.filter((m) => !isDown(m))
					.map((m): Turn => ({
						side: 'monster',
						monster: m,
						initiative:
							(monsterDefs.get(m.templateId)?.initiative ?? BASE_INITIATIVE) +
							d6(),
					})),
			),
		]
		// Highest first. The sort is stable, so the party-then-monsters order
		// above is the tie-break.
		turns.sort((a, b) => b.initiative - a.initiative)

		for (const turn of turns) {
			if (turn.side === 'monster') {
				if (!isDown(turn.monster)) {
					this.resolveMonsterAttack(turn.monster, turn.initiative)
				}
				continue
			}
			const actor = useGameStore.getState().party.find((p) => p.id === turn.id)
			if (!actor || isDown(actor)) continue // Skip if downed
			const action = queue.find((a) => a.actorId === actor.id)
			if (!action) continue

			if (action.actionType === 'ATTACK') {
				const targetIdx = action.target?.index ?? 0
				this.resolvePartyAttack(actor, targetIdx, turn.initiative)
			} else if (action.actionType === 'DEFEND') {
				store.addLog(
					`> [${turn.initiative}] ${actor.name} takes a defensive stance!`,
				)
			} else if (action.actionType === 'CAST_SPELL') {
				store.addLog(`> [${turn.initiative}] ${actor.name} weaves a spell!`)
			}
		}

		// Round Cleanup & Transition Check
		this.evaluateCombatOutcome()
	}

	public finishCombat(): void {
		const store = useGameStore.getState()
		this.cleanup()
		store.setEncounter(null)
		store.setCombatGains(null)
		store.setScreen('WORLD_MAP')
		store.clearActionQueue()
		this.onExitCombat?.('won')
	}

	public flee(): void {
		const store = useGameStore.getState()
		this.cleanup()
		store.setEncounter(null)
		store.setScreen('WORLD_MAP')
		store.addLog('> You fled from combat!')
		this.onExitCombat?.('fled')
	}

	public cleanup(): void {
		this.unbindInput?.()
	}
}

export const combatEngine = new CombatEngine()
