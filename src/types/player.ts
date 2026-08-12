export type FormationRow = 'F' | 'M' | 'B' // Front, Middle, Back
export type StatusEffect = 'OK' | 'PSN' | 'CRIT' | 'PAR' | 'DED'
export type CharacterClass = 'Fighter' | 'Mage' | 'Cleric' | 'Rogue' | 'Paladin'

export interface ResourceBar {
	current: number
	max: number
}

export interface PlayerCharacter {
	id: string
	name: string
	class: CharacterClass
	hp: ResourceBar
	mp: ResourceBar
	row: FormationRow
	status: StatusEffect
	level: number
}
