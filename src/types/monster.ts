import type { ResourceBar } from '@/types'
export interface ActiveMonster {
	id: string // Unique instance ID (e.g. "goblin-1", "goblin-2")
	templateId: string // The monster def's _id (useContentStore.monsters)
	name: string
	hp: ResourceBar // Individual current & max HP
	// Future expansion: equipment, status effects, custom stats, loot
}

export interface MonsterGroup {
	id: string
	name: string
	count: number
	inMeleeRange: boolean
	monsters: ActiveMonster[]
}

export interface ActiveEncounter {
	id: string
	zoneId: string
	difficultyLevel: number
	groups: MonsterGroup[]
	phase: 'INIT' | 'PLANNING' | 'EXECUTION' | 'FLED'
}
