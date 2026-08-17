import type { PlayerCharacter } from '@/types'

export class PartyService {
	/**
	 * Fetches the initial party roster from static JSON or API.
	 */
	public static async fetchParty(): Promise<PlayerCharacter[]> {
		const response = await fetch('/data/party.json')
		if (!response.ok) {
			throw new Error(
				`[PartyService] Failed to load party data. Status: ${response.status}`,
			)
		}

		const partyData = (await response.json()) as PlayerCharacter[]
		return partyData
	}
}
