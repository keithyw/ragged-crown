import type { TileDef, Zone } from '@shared/types'
import type { Monster } from '@/types'

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

	/** Determines if a step triggers an encounter based on tile rate & zone difficulty */
	public static shouldTriggerEncounter(tile: TileDef, zone: Zone): boolean {
		// cities, villages, towns
		if (zone.difficultyLevel === 0) return false
		const baseRate = tile.encounterRate ?? 0.01 // Default 1%
		const difficultyMultiplier = Math.max(1, zone.difficultyLevel)
		const finalChance = baseRate * difficultyMultiplier
		return Math.random() < finalChance
	}
}
