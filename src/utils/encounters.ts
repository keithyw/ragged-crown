import type {
	DifficultyConfig,
	MonsterDef,
	MonsterRarity,
	TileDef,
	Zone,
} from '@shared/types'
import type { StoredDoc } from '@/services/ContentSource'

type Rand = () => number

/**
 * What each rarity tier is worth when a monster is picked for a random
 * encounter ([Combat 24], DATA-MODEL.md 2.5). A monster's chance is its weight
 * divided by the total of the candidates, so the size of the pool needs no
 * tuning. Starting values, to be adjusted by playing.
 */
export const RARITY_WEIGHTS: Record<MonsterRarity, number> = {
	common: 100,
	uncommon: 50,
	scarce: 25,
	rare: 10,
	'very rare': 4,
	'ultra rare': 1,
}

/**
 * The chance (0 to 1) that a step starts a random encounter. `none` and an
 * unset value never do; `terrain` reads the terrain's `encounterRate` (absent
 * = 0, so ground without one is safe); `config` reads the difficulty
 * configuration's `encounterChance`, a percentage.
 */
export const encounterChance = (
	mode: Zone['randomEncounters'],
	tile: TileDef | undefined,
	config: DifficultyConfig,
): number => {
	if (mode === 'terrain') return tile?.encounterRate ?? 0
	if (mode === 'config') return (config.encounterChance ?? 0) / 100
	return 0
}

/**
 * The monsters a random encounter can pick from. Never a unique monster, and
 * never one above the configuration's level. `terrain` wants the monsters that
 * list the terrain stepped on; `config` wants the configuration's pool.
 */
export const encounterCandidates = (
	mode: Zone['randomEncounters'],
	tile: StoredDoc<TileDef> | undefined,
	config: DifficultyConfig,
	monsters: Iterable<StoredDoc<MonsterDef>>,
): StoredDoc<MonsterDef>[] => {
	if (mode !== 'terrain' && mode !== 'config') return []
	const out: StoredDoc<MonsterDef>[] = []
	for (const m of monsters) {
		if (m.isUnique || m.level > config.level) continue
		if (RARITY_WEIGHTS[m.rarity] === undefined) continue
		const listed =
			mode === 'terrain'
				? !!tile && (m.terrainIds ?? []).includes(tile._id)
				: (config.monsterIds ?? []).includes(m._id)
		if (listed) out.push(m)
	}
	return out
}

/** One candidate, drawn by rarity weight. Undefined when there are none. */
export const pickWeighted = (
	candidates: StoredDoc<MonsterDef>[],
	rand: Rand = Math.random,
): StoredDoc<MonsterDef> | undefined => {
	const total = candidates.reduce((sum, m) => sum + RARITY_WEIGHTS[m.rarity], 0)
	if (total <= 0) return undefined
	let roll = rand() * total
	for (const m of candidates) {
		roll -= RARITY_WEIGHTS[m.rarity]
		if (roll < 0) return m
	}
	return candidates[candidates.length - 1]
}

/** How many of a monster appear: its `numberAppearing` dice, rolled. */
export const rollNumberAppearing = (
	def: MonsterDef,
	rand: Rand = Math.random,
): number => {
	let n = 0
	for (let i = 0; i < def.numberAppearing.count; i++) {
		n += Math.floor(rand() * def.numberAppearing.die) + 1
	}
	return n
}
