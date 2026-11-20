import type {
	DifficultyConfig,
	Material,
	Qualifiers,
	Quality,
} from '@shared/types'
import {
	ARMOR_GROUPS,
	ARMOR_MATERIALS,
	WEAPON_GROUPS,
	WEAPON_MATERIALS,
} from '@/constants'

type Rand = () => number

/** What the roll reads of a def. The store types every item as `ItemDef`. */
type GearInfo = { kind: string; type?: string }

/**
 * Quality is rolled in percent ([Game 24]): Normal 50, Poor and Good 15 each,
 * Shoddy and Superior 10 each, lowest to highest.
 */
const QUALITY_CHANCES: [Quality, number][] = [
	['shoddy', 10],
	['poor', 15],
	['normal', 50],
	['good', 15],
	['superior', 10],
]

export const rollQuality = (rand: Rand = Math.random): Quality => {
	const roll = rand() * 100
	let running = 0
	for (const [quality, chance] of QUALITY_CHANCES) {
		running += chance
		if (roll < running) return quality
	}
	return 'normal'
}

/**
 * Picks a material for a weapon or armor type from a difficulty
 * configuration's table ([Game 23]):
 *
 * 1. Filter: only the materials of the type's group are candidates.
 * 2. Roll 0 to 100 and walk the candidates in the group's order, adding up
 *    their chances (percent). The roll lands on the first material whose
 *    running total passes it.
 * 3. If it lands on none, the table's default. The chances needn't add up to
 *    100: what's left over is the default's share. Over 100, the later
 *    materials simply never come up (a tools-side check is for later).
 *
 * With no table for the group (or no configuration), the lowest value
 * possible: the first material of the type's first category. A safety net.
 */
export const rollMaterial = (
	kind: 'weapon' | 'armor',
	type: string,
	config: DifficultyConfig | undefined,
	rand: Rand = Math.random,
): Material | undefined => {
	const groups = kind === 'weapon' ? WEAPON_GROUPS : ARMOR_GROUPS
	const found = Object.entries(groups).find(([, g]) => g.types.includes(type))
	if (!found) return undefined
	const [groupName, group] = found
	const materialsOf = (category: string): readonly Material[] =>
		kind === 'weapon'
			? WEAPON_MATERIALS[category as keyof typeof WEAPON_MATERIALS]
			: ARMOR_MATERIALS[category as keyof typeof ARMOR_MATERIALS]
	const candidates = group.categories.flatMap(materialsOf)

	const tables = config?.materials[kind] as
		| Record<
				string,
				{ default: Material; chances: Partial<Record<Material, number>> }
		  >
		| undefined
	const table = tables?.[groupName]
	if (!table) return candidates[0]

	const roll = rand() * 100
	let running = 0
	for (const material of candidates) {
		const chance = table.chances[material] ?? 0
		if (chance <= 0) continue
		running += chance
		if (roll < running) return material
	}
	return table.default
}

/**
 * The qualifiers an instance of a def ends up with: what the designer set is
 * kept, and only what is missing is rolled ([Game 24]). Anything but a weapon
 * or armor has none.
 */
export const completeQualifiers = (
	def: GearInfo | undefined,
	authored: Qualifiers | undefined,
	config: DifficultyConfig | undefined,
	rand: Rand = Math.random,
): Qualifiers | undefined => {
	if (def?.kind !== 'weapon' && def?.kind !== 'armor') return undefined
	const material =
		authored?.material ?? rollMaterial(def.kind, def.type ?? '', config, rand)
	return {
		quality: authored?.quality ?? rollQuality(rand),
		...(material && { material }),
	}
}

/** Two instances may share a pile only if every qualifier is identical. */
export const sameQualifiers = (
	a: Qualifiers | undefined,
	b: Qualifiers | undefined,
): boolean => a?.quality === b?.quality && a?.material === b?.material

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Shoddy Leather Sandals": the quality and material, then the def's name. */
export const qualifiedName = (
	name: string,
	qualifiers: Qualifiers | undefined,
): string =>
	[qualifiers?.quality, qualifiers?.material]
		.filter((q): q is NonNullable<typeof q> => !!q)
		.map(capitalize)
		.concat(name)
		.join(' ')
