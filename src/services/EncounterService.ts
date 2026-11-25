import type { TileDef, Zone } from '@shared/types'
import { zoneLoaderService } from '@/services/ZoneLoaderService'
import { encounterChance } from '@/utils/encounters'

export class EncounterService {
	/**
	 * Whether a step starts a random encounter, from the zone's
	 * `randomEncounters` setting ([Combat 23], [Combat 24]): never for `none`
	 * (towns, and any zone that doesn't say), the terrain's `encounterRate` for
	 * `terrain`, the difficulty configuration's chance for `config`.
	 */
	public static shouldTriggerEncounter(tile: TileDef, zone: Zone): boolean {
		const chance = encounterChance(
			zone.randomEncounters,
			tile,
			zoneLoaderService.difficultyConfig(zone),
		)
		return Math.random() < chance
	}
}
