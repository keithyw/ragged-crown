export type Debuff =
	'poisoned' | 'paralyzed' | 'silenced' | 'blinded' | 'cursed' | 'dead'
export type ClassType = 'Fighter' | 'Mage' | 'Cleric' | 'Rogue' | 'Paladin'

export type GenderType = 'male' | 'female' | 'non-binary'
export type Race = 'human' | 'elf' | 'dwarf' | 'half-orc' | 'halfling'
export interface ResourceBar {
	current: number
	max: number
}

export const SpellCaster: string[] = ['Mage', 'Cleric', 'Paladin']

export interface PlayerCharacter {
	id: string
	name: string
	gender: GenderType
	race: Race
	class: ClassType
	level: number
	hp: ResourceBar
	sp: ResourceBar
	order: number
	debuffs: Debuff[]
	portrait?: string
}
