import {
	ARMOR_QUALITY_INITIATIVE,
	ATTRIBUTE_EFFECTS,
	BASE_INITIATIVE,
	BODY_ARMOR_SLOTS,
	QUALITY_DAMAGE_BONUS,
	WEAPON_QUALITY_INITIATIVE,
} from '@/constants'
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

/**
 * Damage a defense rating takes off every hit ([Combat 16]): one point per 10
 * of defense, rounded to the nearest, so 0-4 is 0, 5-14 is 1, 15-24 is 2.
 * Physical damage only; magic and elements are out of scope. A hit can be
 * reduced to 0.
 */
export const damageReduction = (defense: number): number =>
	Math.max(0, Math.floor((defense + 5) / 10))

/** A hit after the target's defense, never below 0. */
export const mitigate = (damage: number, defense: number): number =>
	Math.max(0, damage - damageReduction(defense))

/**
 * A character's initiative before the round's 1d6 ([Combat 17]): the base,
 * plus speed ([Attributes 3]), plus the equipped weapon's quality, plus the
 * armor quality penalty. The penalty is the average over the worn body pieces
 * only (empty slots don't dilute it), rounded toward 0, so it never passes the
 * worst single piece (-2). The sheet shows this number; combat adds the roll.
 */
export const initiativeRating = (
	character: PlayerCharacter,
	defs: Parameters<typeof equippedWeapon>[1],
): number => {
	const weaponQuality = equippedWeapon(character, defs)?.qualifiers?.quality
	const inventory = character.inventory ?? []
	const worn = BODY_ARMOR_SLOTS.flatMap((slot) => {
		const uid = character.equipment?.[slot]
		const entry = inventory.find((e) => e.uid === uid)
		return entry ? [entry.qualifiers?.quality] : []
	})
	const armorPenalty = worn.length
		? Math.trunc(
				worn.reduce(
					(sum, q) => sum + ((q && ARMOR_QUALITY_INITIATIVE[q]) || 0),
					0,
				) / worn.length,
			) || 0
		: 0
	return (
		BASE_INITIATIVE +
		tableModifier(
			ATTRIBUTE_EFFECTS.speed.initiative,
			character.attributes.speed,
		) +
		((weaponQuality && WEAPON_QUALITY_INITIATIVE[weaponQuality]) || 0) +
		armorPenalty
	)
}
