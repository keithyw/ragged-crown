import type { ResourceBar } from '@/types'
export interface Monster {
	id: string
	name: string
	level: number
	maxHp: number
	portraitSymbol: string // ASCII placeholder or sprite key
	color?: string
}

export interface ActiveMonster {
	id: string // Unique instance ID (e.g. "goblin-1", "goblin-2")
	templateId: string // References base monster definition
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
	dangerLevel: number
	groups: MonsterGroup[]
	phase: 'INIT' | 'PLANNING' | 'EXECUTION' | 'FLED'
}
