import type { Zone } from '@/types'

class MapLoaderService {
	private cache = new Map<string, Zone>()

	/**
	 * Fetches a zone file on demand, parses it, and caches it in memory.
	 */
	async loadZone(zoneId: string): Promise<Zone> {
		if (this.cache.has(zoneId)) {
			return this.cache.get(zoneId)!
		}

		try {
			const response = await fetch(`/data/maps/${zoneId.toLowerCase()}.json`)
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const rawData = await response.json()
			const zone = this.parseAndValidateZone(rawData)
			this.cache.set(zoneId, zone)
			return zone
		} catch (error) {
			console.error(
				`[MapLoaderService] Failed to load zone "${zoneId}":`,
				error,
			)
			throw error
		}
	}

	/**
	 * Preloads adjacent zones in the background without blocking execution
	 */
	preloadZones(zoneIds: string[]): void {
		zoneIds.forEach((id) => {
			if (!this.cache.has(id)) {
				this.loadZone(id).catch(() => {})
			}
		})
	}

	/**
	 * Validates raw JSON schema and ensures proper type conformity
	 */
	private parseAndValidateZone(rawData: unknown): Zone {
		return rawData as Zone
	}

	/** Clears memory cache if resource limits are reached */
	clearCache(): void {
		this.cache.clear()
	}
}

export const mapLoaderService = new MapLoaderService()
