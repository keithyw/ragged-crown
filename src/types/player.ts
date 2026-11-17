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

/**
 * One cell of a character's inventory: an instance of an item, weapon or armor
 * def (tools DATA-MODEL.md section 7). `quantity` only when the def has a
 * `maxQuantity`. Game-only for now; whether it is shared is open ([Inventory 19]).
 */
export interface InventoryEntry {
	uid: string
	itemId: string // the def's _id
	quantity?: number
}

/** An item waiting to be handed out by a GIVE_ITEM interaction ([Game 17]). */
export interface PoolItem {
	itemId: string
	quantity: number
}

/** The pool being distributed, and the cell leftovers go back to. */
export interface GivePool {
	pos: { x: number; y: number }
	items: PoolItem[]
}

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
	inventory?: InventoryEntry[]
}
