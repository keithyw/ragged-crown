import type { PlayerCharacter } from '@/types'

export interface SaveMetadata {
	id: string
	name: string
	createdAt: number
	updatedAt: number
	playtimeSeconds: number
}

export type FlagValue = boolean | string | number

export interface WorldState {
	currentZoneId: string
	playerPosition: {
		x: number
		y: number
	}
	flags: Record<string, FlagValue>
}

export interface SaveGameDocument {
	metadata: SaveMetadata
	worldState: WorldState
	activePartyMemberIds: string[]
	characterPool: PlayerCharacter[]
}

/** Storage index entry for fast listing in the Load Game menu */
export type SaveGameHeader = SaveMetadata
