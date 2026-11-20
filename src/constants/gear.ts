import type {
	ArmorGroup,
	ArmorMaterial,
	ArmorMaterialCategory,
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
