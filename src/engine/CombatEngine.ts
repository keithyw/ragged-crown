import { BASE_INITIATIVE, DEFAULT_STARTING_POSITION } from '@/constants'
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
import {
	defenseRating,
	equippedWeapon,
	equippedWeapons,
	type HandSlot,
} from '@/utils/equipment'
import { isDown, withStatus } from '@/utils/status'
import {
	encounterCandidates,
	pickWeighted,
	rollNumberAppearing,
} from '@/utils/encounters'
import { qualifiedName } from '@/utils/qualifiers'
import type { EncounterGroup, MonsterDef, TileDef, Zone } from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'

export class CombatEngine {
	private unbindInput?: () => void
	private onExitCombat?: (outcome: 'won' | 'fled') => void

	private pendingActionType: CombatActionType | null = null
	// A dual wielder's attacks ([Combat 27]): the hands still to be given a
	// target, and the attacks already given one. Queued together once both
	// have a target, so Escape cancels both.
	private pendingSlots: HandSlot[] = []
	private pendingAttacks: QueuedAction[] = []
	// The monster that downed the last party member to fall ([Combat 26]).
	private lastKiller: string | null = null

	public enterCombat(onExitCombat?: (outcome: 'won' | 'fled') => void): void {
		if (onExitCombat) {
			this.onExitCombat = onExitCombat
		}
		const store = useGameStore.getState()
		store.setCombatPhase('INIT')
		this.lastKiller = null
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
			const weapons = equippedWeapons(
				currentChar,
				useContentStore.getState().items,
			)
			this.pendingSlots = weapons.length === 2 ? weapons.map((w) => w.slot) : []
			this.pendingAttacks = []
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
			// A dual wielder picks a target per weapon, so name the weapon.
			const weapon = this.pendingSlots[0] && this.pendingWeaponName()
			store.addLog(
				weapon
					? `> ${weapon}: select target group [1-${encounter.groups.length}]`
					: `> Select Target Group [1-${encounter.groups.length}]`,
			)
			this.bindTargetSelectInput(monsterGroups)
		}
	}

	private handleTargetSelectInput(key: string): boolean {
		const store = useGameStore.getState()
		if (key === 'Escape') {
			store.setSubPhase('ACTION_SELECT')
			this.pendingActionType = null
			this.pendingSlots = []
			this.pendingAttacks = []
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

	/**
	 * A random encounter ([Combat 24]): one monster picked by rarity from the
	 * candidates for this zone and terrain, as many as its `numberAppearing`
	 * rolls. Undefined when nothing can appear (an empty pool, nothing listing
	 * this terrain, a level that excludes everyone): no encounter is forced.
	 */
	public generateEncounter(
		zone: Zone,
		tile: TileDef | undefined,
		mode: Zone['randomEncounters'] = zone.randomEncounters,
	): ActiveEncounter | undefined {
		const config = zoneLoaderService.difficultyConfig(zone)
		const candidates = encounterCandidates(
			mode,
			tile as StoredDoc<TileDef> | undefined,
			config,
			useContentStore.getState().monsters.values(),
		)
		const monster = pickWeighted(candidates)
		if (!monster) {
			console.warn(
				`No monster can appear in "${zone.id}" on "${tile?.name}" ` +
					`(${mode ?? 'none'}), so there is no encounter.`,
			)
			return undefined
		}

		return {
			id: `enc-${Date.now()}`,
			zoneId: zone.id,
			difficultyLevel: config.level,
			groups: [
				this.createMonsterGroup(monster, rollNumberAppearing(monster), true),
			],
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
		this.pendingSlots = []
		this.pendingAttacks = []
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

		const weaponName = this.pendingSlots[0] && this.pendingWeaponName()
		const weaponSlot = this.pendingSlots.shift()
		const action: QueuedAction = {
			actorId: currentChar.id,
			actionType,
			...(targetGroupIndex !== undefined && {
				target: { type: 'MONSTER_GROUP', index: targetGroupIndex },
			}),
			...(weaponSlot && { weaponSlot }),
		}
		this.pendingAttacks.push(action)

		// A dual wielder's second weapon still needs a target ([Combat 27]).
		if (this.pendingSlots.length > 0) {
			store.addLog(
				`> ${currentChar.name} queued: ${actionType} (${weaponName})`,
			)
			this.queueOrPromptTarget(actionType)
			return
		}

		this.pendingAttacks.forEach((a) => store.queueAction(a))
		this.pendingAttacks = []
		store.addLog(
			`> ${currentChar.name} queued: ${actionType}${weaponName ? ` (${weaponName})` : ''}`,
		)

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

	/** The weapon in the next hand waiting for a target ([Combat 27]). */
	private pendingWeaponName(): string | undefined {
		const store = useGameStore.getState()
		const character = store.party[store.activeCharacter]
		const slot = this.pendingSlots[0]
		return character && slot
			? equippedWeapon(character, useContentStore.getState().items, slot)?.name
			: undefined
	}

	public resetPlanning(): void {
		const store = useGameStore.getState()
		this.pendingSlots = []
		this.pendingAttacks = []
		store.clearActionQueue()
		store.setActiveCharacter(0)
		store.addLog('> Planning phase reset.')
		this.startPlanning()
	}

	private resolvePartyAttack(
		actor: PlayerCharacter,
		targetGroupIndex: number,
		initiative: number,
		weaponSlot?: HandSlot,
	): void {
		const store = useGameStore.getState()
		const encounter = store.encounter
		if (!encounter || !encounter.groups[targetGroupIndex]) return

		const targetGroup = encounter.groups[targetGroupIndex]

		const targetMonster = targetGroup.monsters.find((m) => !isDown(m))

		// Nobody left in the group: the attack is skipped silently ([Combat 20]).
		if (!targetMonster) return

		// The weapon, quality and strength are worked out in one place, so the
		// character sheet's range matches ([Inventory 46]). A dual wielder's
		// attack names its hand ([Combat 27]).
		const { weapon, roll, hit } = attackProfile(
			actor,
			useContentStore.getState().items,
			weaponSlot,
		)
		let damage = 0
		for (let i = 0; i < roll.count; i++) {
			damage += Math.floor(Math.random() * roll.die) + 1
		}
		// The monster's defense value takes points off the hit ([Combat 16]).
		const defense =
			useContentStore.getState().monsters.get(targetMonster.templateId)
				?.defenseValue ?? 0
		damage = mitigate(hit(damage), defense)
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
			this.lastKiller = m.name
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
			this.transitionToGameOver()
			return
		}

		// Continue to next round
		store.clearActionQueue()
		store.setActiveCharacter(0)
		this.startPlanning()
	}

	/**
	 * A party wipe ([Combat 26]): tell the player and wait for Space. Nothing
	 * else does anything meanwhile, so the swallowed keys never reach the map.
	 */
	private transitionToGameOver(): void {
		const store = useGameStore.getState()
		store.setSlainBy(this.lastKiller ?? 'the monsters')
		store.setCombatPhase('GAME_OVER')
		store.addLog('> Your party has fallen... Game Over.')
		this.unbindInput?.()
		this.unbindInput = inputManager.registerHandler((key) => {
			if (key === ' ') this.endGameOver()
			return true
		})
	}

	/**
	 * Leaves a lost game for the main menu. There is no saved game, so the
	 * party, the encounter, the log and the position are cleared; the saved
	 * characters are untouched (damage only reached the party's copies). The
	 * zone and the flags are reset by Start New Game itself.
	 */
	public endGameOver(): void {
		const store = useGameStore.getState()
		this.cleanup()
		this.onExitCombat = undefined
		this.lastKiller = null
		store.setEncounter(null)
		store.setCombatGains(null)
		store.setSlainBy(null)
		store.clearActionQueue()
		store.setActiveCharacter(0)
		store.setSubPhase('ACTION_SELECT')
		store.setSelectedTargetIndex(-1)
		store.setParty([])
		store.setPlayerPosition(DEFAULT_STARTING_POSITION)
		useGameStore.setState({ combatPhase: null, logs: [], latestLogCount: 0 })
		store.setScreen('MAIN_MENU')
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
			| {
					side: 'party'
					id: string
					action: QueuedAction
					initiative: number
			  }
			| { side: 'monster'; monster: ActiveMonster; initiative: number }

		// One turn per queued action, so a dual wielder's two attacks each roll
		// their own initiative with their own weapon ([Combat 27]).
		const turns: Turn[] = [
			...store.party
				.filter((p) => !isDown(p))
				.flatMap((p) =>
					queue
						.filter((a) => a.actorId === p.id)
						.map((action): Turn => ({
							side: 'party',
							id: p.id,
							action,
							initiative: initiativeRating(p, items, action.weaponSlot) + d6(),
						})),
				),
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
			const action = turn.action

			if (action.actionType === 'ATTACK') {
				const targetIdx = action.target?.index ?? 0
				this.resolvePartyAttack(
					actor,
					targetIdx,
					turn.initiative,
					action.weaponSlot,
				)
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
