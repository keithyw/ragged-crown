export interface Monster {
	id: string
	name: string
	level: number
	maxHp: number
	portraitSymbol: string // ASCII placeholder or sprite key
	color?: string
}

export interface MonsterGroup {
	monsterDefId: string
	name: string
	count: number
	inMeleeRange: boolean
}

export interface ActiveEncounter {
	id: string
	zoneId: string
	dangerLevel: number
	groups: MonsterGroup[]
	phase: 'INIT' | 'PLANNING' | 'EXECUTION' | 'FLED'
}
