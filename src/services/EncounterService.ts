import type {
	ActiveEncounter,
	Monster,
	MonsterGroup,
	TileDef,
	Zone,
} from '@/types'

export class EncounterService {
	// this may change in the future to load up
	// monsters by the zone
	public static async fetchMonsters(): Promise<Monster[]> {
		const res = await fetch('/data/monster.json')
		if (!res.ok) {
			throw new Error(`Failed to load monster data. Status: ${res.status}`)
		}
		const monsters = (await res.json()) as Monster[]
		return monsters
	}

	/** Determines if a step triggers an encounter based on tile rate & zone danger */
	public static shouldTriggerEncounter(tile: TileDef, zone: Zone): boolean {
		console.log('encounter rate', tile.encounterRate)
		const baseRate = tile.encounterRate ?? 0.01 // Default 1%
		const dangerMultiplier = Math.max(1, zone.dangerLevel)
		const finalChance = baseRate * dangerMultiplier
		const ran = Math.random()

		console.log('final chance', finalChance)
		console.log('random', ran)

		return Math.random() < finalChance
	}

	/** Generates a simple 1-2 group encounter */
	public static generateEncounter(zone: Zone, tile: TileDef): ActiveEncounter {
		const isRoad = tile.name.toLowerCase().includes('road')

		const primaryGroup: MonsterGroup = isRoad
			? {
					monsterDefId: 'bandit',
					name: 'Road Bandit',
					count: Math.floor(Math.random() * 3) + 1,
					inMeleeRange: true,
				}
			: {
					monsterDefId: 'goblin',
					name: 'Goblin',
					count: Math.floor(Math.random() * 4) + 1,
					inMeleeRange: true,
				}

		const groups: MonsterGroup[] = [primaryGroup]

		// 30% chance for a secondary ranged/flanking group
		if (Math.random() < 0.3) {
			groups.push({
				monsterDefId: 'giant_spider',
				name: 'Giant Spider',
				count: Math.floor(Math.random() * 2) + 1,
				inMeleeRange: false,
			})
		}

		return {
			id: `enc-${Date.now()}`,
			zoneId: zone.id,
			dangerLevel: zone.dangerLevel,
			groups,
			phase: 'INIT',
		}
	}
}
