import type { RegionDialogs } from '@/types'

class DialogService {
	async getDialogByRegionId(regionId: string): Promise<RegionDialogs> {
		const res = await fetch(`/data/dialogs/${regionId}.json`)
		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`)
		}
		const dialogs: RegionDialogs = await res.json()
		return dialogs
	}
}

export const dialogService = new DialogService()
