import {
	ARMOR_MATERIAL_INITIATIVE,
	ARMOR_QUALITY_INITIATIVE,
	ATTRIBUTE_EFFECTS,
	BASE_INITIATIVE,
	BODY_ARMOR_SLOTS,
	CURRENCIES,
	DUAL_WIELD_DAMAGE_PENALTY,
	DUAL_WIELD_INITIATIVE_PENALTY,
	MATERIAL_ARMOR_SLOTS,
	QUALITY_DAMAGE_BONUS,
	WEAPON_QUALITY_INITIATIVE,
} from '@/constants'
import type {
	ActiveEncounter,
	ActiveMonster,
	CharacterCurrency,
	PlayerCharacter,
} from '@/types'
import type { MonsterDef } from '@shared/types'
import { equippedWeapon, equippedWeapons, type HandSlot } from './equipment'
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
 * the character's strength ([Attributes 2]). A dual wielder ([Combat 27])
 * names the hand the attack is made with; each attack takes the dual wield
 * damage penalty.
 */
export const attackProfile = (
	character: PlayerCharacter,
	defs: Parameters<typeof equippedWeapon>[1],
	slot?: HandSlot,
) => {
	const weapon = equippedWeapon(character, defs, slot)
	const dual = isDualWielding(character, defs)
	const roll = weapon?.damage ?? { count: 1, die: 4 }
	const quality = weapon?.qualifiers?.quality
	const bonus =
		(quality ? QUALITY_DAMAGE_BONUS[quality] : 0) +
		tableModifier(
			ATTRIBUTE_EFFECTS.strength.damage,
			character.attributes.strength,
		)
	/** A raw dice total after the bonus and the dual wield penalty. */
	const hit = (dice: number) => dualWieldHit(Math.max(0, dice + bonus), dual)
	return {
		weapon,
		roll,
		hit,
		/** The lowest and highest an attack can deal, before defense. */
		min: hit(roll.count),
		max: hit(roll.count * roll.die),
	}
}

/** Two weapons held: two attacks, one per weapon ([Combat 20]). */
export const isDualWielding = (
	character: PlayerCharacter,
	defs: Parameters<typeof equippedWeapons>[1],
): boolean => equippedWeapons(character, defs).length === 2

/**
 * The dual wield damage penalty ([Combat 20]): -1, but it can't take a hit
 * below 1. A hit already at 0 stays 0, so two weapons never beat one.
 */
const dualWieldHit = (damage: number, dual: boolean): number =>
	dual && damage > 0 ? Math.max(1, damage + DUAL_WIELD_DAMAGE_PENALTY) : damage

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
 * worst single piece (-2). Plus the armor material bonus ([Inventory 48]),
 * averaged the same way. The sheet shows this number; combat adds the roll.
 * A dual wielder ([Combat 27]) has one per weapon: the hand's weapon quality,
 * and the `hand1` attack takes the dual wield penalty.
 */
export const initiativeRating = (
	character: PlayerCharacter,
	defs: Parameters<typeof equippedWeapon>[1],
	slot?: HandSlot,
): number => {
	const weaponQuality = equippedWeapon(character, defs, slot)?.qualifiers
		?.quality
	const dualPenalty =
		slot === 'hand1' && isDualWielding(character, defs)
			? DUAL_WIELD_INITIATIVE_PENALTY
			: 0
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
	// Material ([Inventory 48]): averaged the same way, over its own slots.
	const materials = MATERIAL_ARMOR_SLOTS.flatMap((slot) => {
		const uid = character.equipment?.[slot]
		const entry = inventory.find((e) => e.uid === uid)
		return entry ? [entry.qualifiers?.material] : []
	})
	const materialBonus = materials.length
		? Math.trunc(
				materials.reduce(
					(sum, m) => sum + ((m && ARMOR_MATERIAL_INITIATIVE[m]) || 0),
					0,
				) / materials.length,
			) || 0
		: 0
	return (
		BASE_INITIATIVE +
		tableModifier(
			ATTRIBUTE_EFFECTS.speed.initiative,
			character.attributes.speed,
		) +
		((weaponQuality && WEAPON_QUALITY_INITIATIVE[weaponQuality]) || 0) +
		armorPenalty +
		materialBonus +
		dualPenalty
	)
}

/**
 * The XP an encounter is worth: the sum over every monster in it, from their
 * defs ([Combat 15]). Only asked for after a win, when all of them are down.
 */
export const encounterXp = (
	encounter: ActiveEncounter | null,
	defs: { get: (id: string) => { xp?: number } | undefined },
): number =>
	(encounter?.groups ?? []).reduce(
		(total, group) =>
			total +
			group.monsters.reduce(
				(sum, m) => sum + (defs.get(m.templateId)?.xp ?? 0),
				0,
			),
		0,
	)

/**
 * One character's share of an encounter's XP. A share that doesn't divide
 * evenly rounds up, so the remainder is a small extra (owner, 2026-11-24).
 */
export const xpShare = (total: number, members: number): number =>
	members > 0 ? Math.ceil(total / members) : 0

/**
 * The currency an encounter's monsters carried ([Currency 12]): every monster
 * rolls its def's dice, totalled per currency. One that carries none adds
 * nothing. Only asked for after a win, when all of them are down.
 */
export const encounterCurrency = (
	encounter: ActiveEncounter | null,
	defs: { get: (id: string) => Pick<MonsterDef, 'currency'> | undefined },
	rand: () => number = Math.random,
): CharacterCurrency => {
	const total: CharacterCurrency = {}
	for (const group of encounter?.groups ?? []) {
		for (const m of group.monsters) {
			const carried = defs.get(m.templateId)?.currency
			for (const currency of CURRENCIES) {
				const roll = carried?.[currency]
				if (!roll) continue
				let amount = 0
				for (let i = 0; i < roll.count; i++) {
					amount += Math.floor(rand() * roll.die) + 1
				}
				total[currency] = (total[currency] ?? 0) + amount
			}
		}
	}
	return total
}

/** One character's share of each currency, rounded up like XP. */
export const currencyShare = (
	total: CharacterCurrency,
	members: number,
): CharacterCurrency => {
	const share: CharacterCurrency = {}
	if (members <= 0) return share
	for (const currency of CURRENCIES) {
		const amount = total[currency]
		if (amount) share[currency] = Math.ceil(amount / members)
	}
	return share
}
