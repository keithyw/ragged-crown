import type { TileObjectTypes } from '@/types'

class TileTypeLoaderService {
	async load(): Promise<TileObjectTypes> {
		try {
			const res = await fetch(`/data/tile_objects.json`)
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`)
			}
			const rawData = await res.json()
			const objects = rawData as TileObjectTypes
			return objects
		} catch (e) {
			console.error(e)
			throw e
		}
	}
}

export const tileTypeLoaderService = new TileTypeLoaderService()
