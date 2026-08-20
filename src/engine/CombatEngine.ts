import type {
	ActiveEncounter,
	// MonsterGroup,
	PlayerCharacter,
	// QueuedAction,
} from '@/types'

export interface CombatResult {
	log: string
	targetDefeated: boolean
}

export class CombatEngine {
	/** Delegated Hit/Damage Calculator (Placeholder for future Hit Tables) */
	public static resolveAttack(
		attackerName: string,
		targetName: string,
		isPartyAttacker: boolean,
	): CombatResult {
		// Placeholder damage formula
		const baseDamage = isPartyAttacker
			? Math.floor(Math.random() * 6) + 3
			: Math.floor(Math.random() * 4) + 1

		return {
			log: `> ${attackerName} strikes ${targetName} for ${baseDamage} damage!`,
			targetDefeated: false,
		}
	}

	/** Delegated Spell Calculator (Placeholder for future Magic System) */
	public static resolveSpell(
		casterName: string,
		spellId: string,
		targetName: string,
	): CombatResult {
		return {
			log: `> ${casterName} casts ${spellId} on ${targetName}!`,
			targetDefeated: false,
		}
	}

	/** Check if party is completely wiped out */
	public static isPartyWiped(party: PlayerCharacter[]): boolean {
		return party.every((p) => p.hp.current <= 0 || p.debuffs.includes('dead'))
	}

	/** Check if all monster groups are eliminated */
	public static isEncounterCleared(encounter: ActiveEncounter): boolean {
		return encounter.groups.every((g) => g.count <= 0)
	}
}
