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
	// Difficulty configuration `_id` -> the configuration ([Tools 26]). Filled
	// when a zone loads, so its level and material tables can be read without
	// waiting.
	private configs = new Map<string, DifficultyConfig>()

	/** The difficulty configuration of a zone that has been loaded. */
	difficultyConfig(zone: Zone): DifficultyConfig {
		const config = this.configs.get(zone.difficultyId)
		if (!config) {
			throw new Error(
				`Zone "${zone.id}" has no loaded difficulty configuration`,
			)
		}
		return config
	}

	/** Like `difficultyConfig`, but undefined when there is none to read. */
	configFor(zone: Zone | null): DifficultyConfig | undefined {
		return zone ? this.configs.get(zone.difficultyId) : undefined
	}

	/** The level the player sees for a zone that has been loaded. */
	difficultyLevel(zone: Zone): number {
		return this.difficultyConfig(zone).level
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
		if (!this.configs.has(zone.difficultyId)) {
			const config = await contentSource.get<DifficultyConfig>(
				'difficulty_configs',
				zone.difficultyId,
			)
			this.configs.set(zone.difficultyId, config)
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
		this.configs.clear()
	}
}

export const zoneLoaderService = new ZoneLoaderService()
