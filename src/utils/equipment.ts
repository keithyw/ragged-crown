import type { RandomRoll } from '@shared/types'
import type {
	Equipment,
	EquipmentSlot,
	InventoryEntry,
	PlayerCharacter,
} from '@/types'

/**
 * The part of a def the equip rules read. The store types every item as an
 * ItemDef; weapons and armor are told apart by `kind` and carry `type` and
 * `isTwoHanded`.
 */
type EquipInfo = { kind: string; type?: string; isTwoHanded?: boolean }
type EquipLookup = Map<string, EquipInfo>

export type EquipResult = { character: PlayerCharacter } | { problem: string }

const RING_SLOTS = [
	'ring1',
	'ring2',
	'ring3',
	'ring4',
	'ring5',
	'ring6',
	'ring7',
	'ring8',
	'ring9',
	'ring10',
] as const satisfies readonly EquipmentSlot[]
const EARRING_SLOTS = [
	'earring1',
	'earring2',
] as const satisfies readonly EquipmentSlot[]
const HAND_SLOTS = [
	'hand1',
	'hand2',
] as const satisfies readonly EquipmentSlot[]

/**
 * The slots an armor type can go in, in the order they are tried. Every type
 * has one slot of its own name, except rings and earrings.
 */
const slotsFor = (type: string): readonly EquipmentSlot[] => {
	if (type === 'ring') return RING_SLOTS
	if (type === 'earring') return EARRING_SLOTS
	return [type as EquipmentSlot]
}

/** The slot an entry is equipped in, if any. */
export const slotOf = (
	character: PlayerCharacter,
	uid: string,
): EquipmentSlot | undefined =>
	(Object.keys(character.equipment ?? {}) as EquipmentSlot[]).find(
		(slot) => character.equipment?.[slot] === uid,
	)

const without = (equipment: Equipment, slots: EquipmentSlot[]): Equipment => {
	const next = { ...equipment }
	for (const slot of slots) delete next[slot]
	return next
}

/** Weapons in the hands, first in the inventory array first. */
const heldWeapons = (
	character: PlayerCharacter,
	equipment: Equipment,
	defs: EquipLookup,
) => {
	const inventory = character.inventory ?? []
	return HAND_SLOTS.flatMap((slot) => {
		const uid = equipment[slot]
		const index = inventory.findIndex((e) => e.uid === uid)
		const def = index === -1 ? undefined : defs.get(inventory[index].itemId)
		return def ? [{ slot, index, twoHanded: !!def.isTwoHanded }] : []
	}).sort((a, b) => a.index - b.index)
}

/**
 * A shield takes a hand ([Inventory 41]): a two-handed weapon goes, and with
 * two one-handed weapons held the first in the inventory array goes (no
 * primary hand, [Inventory 40]).
 */
const fitShield = (
	character: PlayerCharacter,
	equipment: Equipment,
	defs: EquipLookup,
): Equipment => {
	const held = heldWeapons(character, equipment, defs)
	const oneHanded = held.filter((w) => !w.twoHanded)
	const gone = [
		...held.filter((w) => w.twoHanded),
		...oneHanded.slice(0, Math.max(0, oneHanded.length - 1)),
	]
	return without(
		equipment,
		gone.map((w) => w.slot),
	)
}

/**
 * Every check before a piece is equipped, in one place so more can join them
 * (a priest and sharp weapons, a mage and swords: class and race, later).
 * Returns why not, or undefined when it can be equipped.
 */
const equipProblem = (
	character: PlayerCharacter,
	entry: InventoryEntry | undefined,
	defs: EquipLookup,
): string | undefined => {
	if (!entry) return 'That is not in this inventory.'
	const def = defs.get(entry.itemId)
	if (def?.kind !== 'weapon' && def?.kind !== 'armor') {
		return 'Only weapons and armor can be equipped.'
	}
	if (slotOf(character, entry.uid)) return 'That is already equipped.'
	if (def.type === 'brooch' && !character.equipment?.cloak) {
		return 'A brooch needs a cloak worn.'
	}
	return undefined
}

/**
 * Equips a weapon or armor piece ([Inventory 40], [Inventory 41]). The piece
 * stays in the inventory; only the mark is set.
 *
 * - A taken armor slot swaps: the old piece is unequipped. A ring or earring
 *   goes in the first free slot, or replaces the first one when all are taken.
 * - A brooch needs a cloak worn.
 * - Hands: a two-handed weapon alone, or two one-handed weapons, or one weapon
 *   and a shield. A one-handed weapon goes in a free hand; with both full, the
 *   first equipped weapon in the inventory array is unequipped.
 */
export const equip = (
	character: PlayerCharacter,
	uid: string,
	defs: EquipLookup,
): EquipResult => {
	const entry = (character.inventory ?? []).find((e) => e.uid === uid)
	const problem = equipProblem(character, entry, defs)
	if (problem || !entry) return { problem: problem ?? '' }
	const def = defs.get(entry.itemId)!
	const equipment = character.equipment ?? {}

	if (def.kind === 'armor') {
		const slots = slotsFor(def.type ?? '')
		const slot = slots.find((s) => !equipment[s]) ?? slots[0]
		const placed = { ...equipment, [slot]: uid }
		// A shield costs a hand: a two-handed weapon goes, and so does the first
		// of two one-handed ones.
		const next =
			def.type === 'shield' ? fitShield(character, placed, defs) : placed
		return { character: { ...character, equipment: next } }
	}

	// A weapon. Two-handed clears both hands and the shield; otherwise it takes
	// a free hand after the hands are made to fit.
	if (def.isTwoHanded) {
		const cleared = without(equipment, [...HAND_SLOTS, 'shield'])
		return {
			character: { ...character, equipment: { ...cleared, hand1: uid } },
		}
	}
	let next = without(
		equipment,
		heldWeapons(character, equipment, defs)
			.filter((w) => w.twoHanded)
			.map((w) => w.slot),
	)
	const room = next.shield ? 1 : 2
	const held = heldWeapons(character, next, defs)
	const gone = held.slice(0, Math.max(0, held.length - room + 1))
	next = without(
		next,
		gone.map((w) => w.slot),
	)
	const slot = HAND_SLOTS.find((s) => !next[s]) ?? 'hand1'
	return {
		character: { ...character, equipment: { ...next, [slot]: uid } },
	}
}

/**
 * Takes a piece off: only the mark goes, the entry stays in the inventory.
 * Taking the cloak off takes the brooch off too.
 */
export const unequip = (
	character: PlayerCharacter,
	uid: string,
): PlayerCharacter => {
	const slot = slotOf(character, uid)
	if (!slot) return character
	const slots: EquipmentSlot[] = slot === 'cloak' ? ['cloak', 'brooch'] : [slot]
	return {
		...character,
		equipment: without(character.equipment ?? {}, slots),
	}
}

/** What a party attack rolls: the dice, and the weapon's name for the log. */
export type AttackWeapon = { name: string; damage: RandomRoll }

/**
 * The weapon a character attacks with ([Combat 3]): the first one in `hand1`,
 * then `hand2`. Dual wielding is not designed ([Combat 20]), so a second
 * weapon is ignored. Missile and thrown weapons are treated as plain ones.
 * Undefined when the hands are empty (the caller falls back to bare hands).
 */
export const equippedWeapon = (
	character: PlayerCharacter,
	defs: Map<string, { kind: string; name: string; damage?: RandomRoll }>,
): AttackWeapon | undefined => {
	for (const slot of HAND_SLOTS) {
		const uid = character.equipment?.[slot]
		const entry = (character.inventory ?? []).find((e) => e.uid === uid)
		const def = entry && defs.get(entry.itemId)
		if (def?.kind === 'weapon' && def.damage) {
			return { name: def.name, damage: def.damage }
		}
	}
	return undefined
}

/**
 * Clears marks whose entry has left the inventory (dropped, traded, handed
 * in), and a brooch left without its cloak.
 */
export const pruneEquipment = (character: PlayerCharacter): PlayerCharacter => {
	const equipment = character.equipment
	if (!equipment) return character
	const uids = new Set((character.inventory ?? []).map((e) => e.uid))
	const gone = (Object.keys(equipment) as EquipmentSlot[]).filter(
		(slot) => !uids.has(equipment[slot]!),
	)
	let next = without(equipment, gone)
	if (!next.cloak) next = without(next, ['brooch'])
	return { ...character, equipment: next }
}
