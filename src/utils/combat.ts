import { ATTRIBUTE_EFFECTS, QUALITY_DAMAGE_BONUS } from '@/constants'
import type { ActiveMonster, PlayerCharacter } from '@/types'
import { equippedWeapon } from './equipment'
import { tableModifier } from './stats'

export const areMonstersAlive = (monsters: ActiveMonster[]): boolean => {
	return monsters.filter((m) => m.hp.current > 0).length > 0
}

export const calculateHPPercent = (
	hpCurrent: number,
	hpMax: number,
): number => {
	return Math.max(0, Math.min(hpCurrent / hpMax) * 100)
}

/**
 * What one party attack deals, worked out in one place so the attack and the
 * character sheet can't disagree ([Inventory 46]): the equipped weapon's dice
 * (1d4 bare-handed, [Combat 3]), plus the weapon's quality ([Combat 13]) and
 * the character's strength ([Attributes 2]). Dual wielding is ignored
 * ([Combat 20]).
 */
export const attackProfile = (
	character: PlayerCharacter,
	defs: Parameters<typeof equippedWeapon>[1],
) => {
	const weapon = equippedWeapon(character, defs)
	const roll = weapon?.damage ?? { count: 1, die: 4 }
	const quality = weapon?.qualifiers?.quality
	const bonus =
		(quality ? QUALITY_DAMAGE_BONUS[quality] : 0) +
		tableModifier(
			ATTRIBUTE_EFFECTS.strength.damage,
			character.attributes.strength,
		)
	return {
		weapon,
		roll,
		bonus,
		/** The lowest and highest an attack can deal, never below 0. */
		min: Math.max(0, roll.count + bonus),
		max: Math.max(0, roll.count * roll.die + bonus),
	}
}
