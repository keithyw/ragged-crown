import type { RegionDialogs } from '@/types'

class DialogService {
	async getDialogByRegionId(regionId: string): Promise<RegionDialogs> {
		console.log('fetching', `/data/dialogs/${regionId}.json`)
		const res = await fetch(`/data/dialogs/${regionId}.json`)
		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`)
		}
		// const response = await fetch(`/data/maps/${zoneId.toLowerCase()}.json`)
		// 	if (!response.ok) {
		// 		throw new Error(`HTTP error! status: ${response.status}`)
		// 	}
		console.log('got response', res)
		const dialogs: RegionDialogs = await res.json()
		console.log('did it parse?', dialogs)
		return dialogs
	}
}

export const dialogService = new DialogService()
