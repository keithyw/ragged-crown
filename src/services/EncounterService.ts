import type { Monster, TileDef, Zone } from '@/types'

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
		const baseRate = tile.encounterRate ?? 0.01 // Default 1%
		const dangerMultiplier = Math.max(1, zone.dangerLevel)
		const finalChance = baseRate * dangerMultiplier
		return Math.random() < finalChance
	}
}
