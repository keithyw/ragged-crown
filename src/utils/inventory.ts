import type { CarriedDef } from '@shared/types'
import type { InventoryEntry, PlayerCharacter, PoolItem } from '@/types'
import { pruneEquipment } from './equipment'

/** Pounds a character can carry per point of strength ([Game 17]; may be raised). */
export const CARRY_PER_STRENGTH = 20

type CarriedInfo = Pick<CarriedDef, 'weight' | 'maxQuantity'>
type CarriedLookup = Map<string, CarriedInfo>

export const carryLimit = (character: PlayerCharacter): number =>
	character.attributes.strength * CARRY_PER_STRENGTH

/** How many of an item a character carries, across all their piles. */
export const countCarried = (
	character: PlayerCharacter,
	itemId: string,
): number =>
	(character.inventory ?? [])
		.filter((e) => e.itemId === itemId)
		.reduce((sum, e) => sum + (e.quantity ?? 1), 0)

/** The weight of everything a character carries. A missing def weighs nothing. */
export const encumbrance = (
	character: PlayerCharacter,
	defs: CarriedLookup,
): number =>
	(character.inventory ?? []).reduce(
		(sum, e) => sum + (defs.get(e.itemId)?.weight ?? 0) * (e.quantity ?? 1),
		0,
	)

/**
 * The weight check: does `quantity` of this def fit on top of what the
 * character already carries? A utility so modifiers can join it later.
 */
export const fitsInInventory = (
	character: PlayerCharacter,
	def: CarriedInfo,
	quantity: number,
	defs: CarriedLookup,
): boolean =>
	encumbrance(character, defs) + def.weight * quantity <= carryLimit(character)

/**
 * Adds items to a character's inventory. Only a def with a `maxQuantity`
 * stacks: it tops up existing piles of the same def, then starts new ones. Any
 * other def gets one entry per item (DATA-MODEL 7).
 */
export const addToInventory = (
	character: PlayerCharacter,
	itemId: string,
	def: CarriedInfo,
	quantity: number,
): PlayerCharacter => {
	const max = def.maxQuantity
	const inventory: InventoryEntry[] = (character.inventory ?? []).map((e) => ({
		...e,
	}))
	let remaining = quantity

	if (max === undefined) {
		for (; remaining > 0; remaining--) {
			inventory.push({ uid: crypto.randomUUID(), itemId })
		}
	} else {
		for (const entry of inventory) {
			if (remaining === 0) break
			if (entry.itemId !== itemId) continue
			const room = max - (entry.quantity ?? 1)
			const added = Math.min(room, remaining)
			if (added > 0) {
				entry.quantity = (entry.quantity ?? 1) + added
				remaining -= added
			}
		}
		while (remaining > 0) {
			const pile = Math.min(max, remaining)
			inventory.push({ uid: crypto.randomUUID(), itemId, quantity: pile })
			remaining -= pile
		}
	}
	return { ...character, inventory }
}

/** The character without one inventory entry (a trade or a drop), and its equipped mark. */
export const removeFromInventory = (
	character: PlayerCharacter,
	uid: string,
): PlayerCharacter =>
	pruneEquipment({
		...character,
		inventory: (character.inventory ?? []).filter((e) => e.uid !== uid),
	})

/**
 * Takes up to `quantity` of a def out of a character's piles, in order, and
 * says how many it found (a TAKE_ITEM, [Inventory 26]). A pile that runs out
 * is removed; one that doesn't keeps the rest.
 */
export const takeFromInventory = (
	character: PlayerCharacter,
	itemId: string,
	quantity: number,
): { character: PlayerCharacter; taken: number } => {
	let remaining = quantity
	const inventory: InventoryEntry[] = []
	for (const entry of character.inventory ?? []) {
		if (entry.itemId !== itemId || remaining === 0) {
			inventory.push(entry)
			continue
		}
		const have = entry.quantity ?? 1
		const take = Math.min(have, remaining)
		remaining -= take
		if (take < have) inventory.push({ ...entry, quantity: have - take })
	}
	return {
		character: pruneEquipment({ ...character, inventory }),
		taken: quantity - remaining,
	}
}

/**
 * The items a set of GIVE_ITEM actions hands out, one line per def with the
 * quantities added up, in the order first listed. A def that isn't loaded is
 * left out.
 */
export const buildPool = (
	gives: PoolItem[],
	defs: Map<string, unknown>,
): PoolItem[] => {
	const pool: PoolItem[] = []
	for (const give of gives) {
		if (!defs.has(give.itemId)) {
			console.warn(`[Interaction] GIVE_ITEM: no item with _id ${give.itemId}`)
			continue
		}
		const line = pool.find((p) => p.itemId === give.itemId)
		if (line) line.quantity += give.quantity
		else pool.push({ ...give })
	}
	return pool
}
