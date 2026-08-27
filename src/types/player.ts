export type Debuff =
	'poisoned' | 'paralyzed' | 'silenced' | 'blinded' | 'cursed' | 'dead'
export type ClassType = 'Fighter' | 'Mage' | 'Cleric' | 'Rogue' | 'Paladin'

export type GenderType = 'male' | 'female' | 'non-binary'
export type Race = 'human' | 'elf' | 'dwarf' | 'half-orc' | 'halfling'
export interface ResourceBar {
	current: number
	max: number
}

export interface Attributes {
	strength: number
	dexterity: number
	intelligence: number
	wisdom: number
	personality: number
	speed: number
	constitution: number
}
export interface NpcProfile {
	isPermanent?: boolean // True for core story characters (cannot be dismissed/deleted)
	isLocked?: boolean // User toggle to prevent accidental dismissal/deletion of hired NPCs
}

export const SpellCaster: string[] = ['Mage', 'Cleric', 'Paladin']

export interface PlayerCharacter {
	id: string
	name: string
	gender: GenderType
	race: Race
	class?: ClassType
	level: number
	hp: ResourceBar
	sp: ResourceBar
	attributes: Attributes
	order: number
	debuffs: Debuff[]
	portrait?: string
	npcDetails?: NpcProfile
}
