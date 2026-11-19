import type { DifficultyConfig, Zone } from '@shared/types'
import { contentSource, type StoredDoc } from '@/services/ContentSource'

/**
 * Loads zones from the content source. Portals and saves refer to a zone by
 * `_id`; the starting zone and the cutscene regions still use the zone's
 * user-facing `id` ([Game 7]).
 */
class ZoneLoaderService {
	private byId = new Map<string, StoredDoc<Zone>>()
	private byDisplayId = new Map<string, StoredDoc<Zone>>()
	// Difficulty configuration `_id` -> its level ([Tools 26]). Filled when a
	// zone loads, so the level can be read without waiting.
	private levels = new Map<string, number>()

	/** The level the player sees for a zone that has been loaded. */
	difficultyLevel(zone: Zone): number {
		const level = this.levels.get(zone.difficultyId)
		if (level === undefined) {
			throw new Error(
				`Zone "${zone.id}" has no loaded difficulty configuration`,
			)
		}
		return level
	}

	async loadById(_id: string): Promise<StoredDoc<Zone>> {
		const cached = this.byId.get(_id)
		if (cached) return cached
		return this.remember(await contentSource.get<Zone>('zones', _id))
	}

	async loadByDisplayId(id: string): Promise<StoredDoc<Zone>> {
		const cached = this.byDisplayId.get(id)
		if (cached) return cached

		const matches = await contentSource.getAll<Zone>('zones', { id })
		if (matches.length !== 1) {
			throw new Error(
				`Expected one zone with id "${id}", found ${matches.length}`,
			)
		}
		return this.remember(matches[0])
	}

	private async remember(zone: StoredDoc<Zone>): Promise<StoredDoc<Zone>> {
		if (!this.levels.has(zone.difficultyId)) {
			const config = await contentSource.get<DifficultyConfig>(
				'difficulty_configs',
				zone.difficultyId,
			)
			this.levels.set(zone.difficultyId, config.level)
		}
		zone.dimensions = zone.dimensions ?? {
			width: zone.terrain[0].length,
			height: zone.terrain.length,
		}
		// Whichever way it was loaded, the next load finds the same object.
		this.byId.set(zone._id, zone)
		this.byDisplayId.set(zone.id, zone)
		return zone
	}

	clearCache(): void {
		this.byId.clear()
		this.byDisplayId.clear()
		this.levels.clear()
	}
}

export const zoneLoaderService = new ZoneLoaderService()
