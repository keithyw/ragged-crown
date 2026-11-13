import type { Zone } from '@shared/types'
import { contentSource, type StoredDoc } from '@/services/ContentSource'

/**
 * Loads a zone from the content source. The game will key zones by `_id`;
 * until portals and saves carry one ([Game 7]), a zone is found by its
 * user-facing `id`.
 */
class ZoneLoaderService {
	private cache = new Map<string, StoredDoc<Zone>>()

	async loadByDisplayId(id: string): Promise<StoredDoc<Zone>> {
		const cached = this.cache.get(id)
		if (cached) return cached

		const matches = await contentSource.getAll<Zone>('zones', { id })
		if (matches.length !== 1) {
			throw new Error(
				`Expected one zone with id "${id}", found ${matches.length}`,
			)
		}
		const zone = matches[0]
		zone.dimensions = zone.dimensions ?? {
			width: zone.terrain[0].length,
			height: zone.terrain.length,
		}
		this.cache.set(id, zone)
		return zone
	}

	clearCache(): void {
		this.cache.clear()
	}
}

export const zoneLoaderService = new ZoneLoaderService()
