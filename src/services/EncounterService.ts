import type { TileDef, Zone } from '@shared/types'
import { zoneLoaderService } from '@/services/ZoneLoaderService'

export class EncounterService {
	/** Determines if a step triggers an encounter based on tile rate & zone difficulty */
	public static shouldTriggerEncounter(tile: TileDef, zone: Zone): boolean {
		// cities, villages, towns
		const level = zoneLoaderService.difficultyLevel(zone)
		if (level === 0) return false
		const baseRate = tile.encounterRate ?? 0.01 // Default 1%
		const difficultyMultiplier = Math.max(1, level)
		const finalChance = baseRate * difficultyMultiplier
		return Math.random() < finalChance
	}
}
