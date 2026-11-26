import type {
	ArmorGroup,
	ArmorMaterial,
	ArmorMaterialCategory,
	Material,
	Quality,
	WeaponGroup,
	WeaponMaterial,
	WeaponMaterialCategory,
} from '@shared/types'

// A copy of the tools' lib/constants/gear.ts, limited to what the material
// roll reads ([Game 23]). The shared types are types-only, so these lists
// can't be imported (CLAUDE.md, "Shared types"). Keep them in step with the
// tools: a category's materials, and which types belong to which group.

export const WEAPON_MATERIALS: Record<
	WeaponMaterialCategory,
	readonly WeaponMaterial[]
> = {
	wood: ['wood'],
	metal: ['iron'],
	leather: ['leather'],
}

export const ARMOR_MATERIALS: Record<
	ArmorMaterialCategory,
	readonly ArmorMaterial[]
> = {
	cloth: ['cloth'],
	leather: ['leather'],
	fur: ['fur'],
	wood: ['wood'],
	metal: ['copper'],
}

interface Group<C extends string> {
	types: readonly string[]
	categories: readonly C[]
}

export const WEAPON_GROUPS: Record<
	WeaponGroup,
	Group<WeaponMaterialCategory>
> = {
	metal: {
		types: [
			'sword',
			'dagger',
			'spear',
			'polearm',
			'axe',
			'mace',
			'flail',
			'fist',
			'hammer',
			'dart',
		],
		categories: ['metal'],
	},
	wood: { types: ['bow', 'crossbow', 'staff', 'club'], categories: ['wood'] },
	leather: { types: ['sling'], categories: ['leather'] },
}

export const ARMOR_GROUPS: Record<ArmorGroup, Group<ArmorMaterialCategory>> = {
	body: {
		types: ['head', 'chest', 'legs', 'hands', 'feet', 'shoulders'],
		categories: ['cloth', 'leather', 'fur'],
	},
	wrists: { types: ['wrists'], categories: ['cloth', 'leather', 'fur'] },
	belt: { types: ['belt'], categories: ['cloth', 'leather'] },
	cloak: { types: ['cloak'], categories: ['cloth', 'leather', 'fur'] },
	shield: { types: ['shield'], categories: ['wood'] },
	jewelry: {
		types: ['neck', 'ring', 'earring', 'brooch'],
		categories: ['metal'],
	},
}

/**
 * Flat damage a weapon's quality adds to a party attack ([Combat 13]). Game
 * only, so not part of the tools' copy above. Starting values are guesses: a
 * Shoddy weapon's penalty is speed, not damage ([Game 22]), so it adds
 * nothing here.
 */
export const QUALITY_DAMAGE_BONUS: Record<Quality, number> = {
	shoddy: 0,
	poor: -1,
	normal: 0,
	good: 1,
	superior: 2,
}

/**
 * What the equipped weapon's quality adds to a character's initiative
 * ([Combat 17]): Shoddy -1, Superior +1, nothing for the rest. Game only.
 */
export const WEAPON_QUALITY_INITIATIVE: Partial<Record<Quality, number>> = {
	shoddy: -1,
	superior: 1,
}

/**
 * What a worn armor piece's quality counts for in the armor initiative penalty
 * ([Combat 17]): Shoddy -2, Poor -1, nothing for the rest (Good and Superior
 * armor do nothing yet). Game only.
 */
export const ARMOR_QUALITY_INITIATIVE: Partial<Record<Quality, number>> = {
	shoddy: -2,
	poor: -1,
}

/** The slots the armor initiative penalty averages over: all but jewelry and the shield. */
export const BODY_ARMOR_SLOTS = [
	'head',
	'chest',
	'legs',
	'hands',
	'wrists',
	'feet',
	'shoulders',
	'belt',
	'cloak',
] as const

/**
 * What a worn armor piece's material counts for in initiative ([Inventory 48]):
 * cloth +1, every other material 0 for now. Averaged like the quality penalty,
 * so it only shows when every counted piece is cloth. Game only.
 */
export const ARMOR_MATERIAL_INITIATIVE: Partial<Record<Material, number>> = {
	cloth: 1,
}

/**
 * Dual wielding ([Combat 20]): the `hand1` attack's initiative penalty, and
 * the damage penalty on both attacks. Game only.
 */
export const DUAL_WIELD_INITIATIVE_PENALTY = -1
export const DUAL_WIELD_DAMAGE_PENALTY = -1

/** The slots the material effect averages over: the body slots minus the belt (too light). */
export const MATERIAL_ARMOR_SLOTS = BODY_ARMOR_SLOTS.filter(
	(slot) => slot !== 'belt',
)
