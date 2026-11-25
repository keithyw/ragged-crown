import type { Qualifiers } from '@shared/types'

/**
 * A condition on a character or monster ([Combat 21]). Several can be held at
 * once. Only `dead` is set by anything yet; asleep and unconscious are data
 * waiting for what causes them.
 */
export type Status = 'dead' | 'asleep' | 'unconscious'
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
	/** Weapons and armor only: rolled once on pickup, then carried ([Game 24]). */
	qualifiers?: Qualifiers
}

/**
 * Where a piece can be equipped (tools DATA-MODEL.md section 7, [Inventory 37]).
 * One slot per armor `type`, except 10 rings (fingers) and 2 earrings. `hand1`
 * and `hand2` hold weapons; a shield has its own slot. No primary hand.
 */
export type EquipmentSlot =
	| 'head'
	| 'chest'
	| 'legs'
	| 'hands'
	| 'wrists'
	| 'feet'
	| 'shoulders'
	| 'belt'
	| 'cloak'
	| 'shield'
	| 'neck'
	| 'brooch'
	| `ring${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
	| `earring${1 | 2}`
	| 'hand1'
	| 'hand2'

/**
 * What a character has equipped: slot to the `uid` of an inventory entry. A
 * piece never leaves the inventory; this map is only the mark.
 */
export type Equipment = Partial<Record<EquipmentSlot, string>>

/** An item waiting to be handed out by a GIVE_ITEM interaction ([Game 17]). */
export interface PoolItem {
	itemId: string
	quantity: number
	qualifiers?: Qualifiers
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
	/** Experience; negative for a starting character ([Combat 22]). */
	xp: number
	/** Made in character creation, before the tutorial zones. Absent = false. */
	isStartingCharacter?: boolean
	hp: ResourceBar
	sp: ResourceBar
	attributes: Attributes
	order: number
	statuses: Status[]
	portrait?: string
	npcDetails?: NpcProfile
	inventory?: InventoryEntry[]
	equipment?: Equipment
}
