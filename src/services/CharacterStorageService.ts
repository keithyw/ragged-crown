import { STORAGE_KEY } from '@/constants'
import type { PlayerCharacter } from '@/types'

export const CharacterStorageService = {
	/**
	 * Retrieve all saved characters from LocalStorage.
	 */
	getAll(): PlayerCharacter[] {
		try {
			const data = localStorage.getItem(STORAGE_KEY)
			if (!data) return []
			return JSON.parse(data) as PlayerCharacter[]
		} catch (error) {
			console.error('Failed to load characters from LocalStorage:', error)
			return []
		}
	},

	/**
	 * Save an entire list of characters to LocalStorage (overwrites existing array).
	 */
	saveAll(characters: PlayerCharacter[]): boolean {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(characters))
			return true
		} catch (error) {
			console.error('Failed to save characters to LocalStorage:', error)
			return false
		}
	},

	/**
	 * Create/Append a single character to LocalStorage.
	 */
	saveCharacter(character: PlayerCharacter): boolean {
		const characters = this.getAll()
		const existingIndex = characters.findIndex((c) => c.id === character.id)

		if (existingIndex >= 0) {
			// Update existing
			characters[existingIndex] = character
		} else {
			// Append new
			characters.push(character)
		}

		return this.saveAll(characters)
	},

	/**
	 * Retrieve a single character by ID.
	 */
	getById(id: string): PlayerCharacter | null {
		const characters = this.getAll()
		return characters.find((c) => c.id === id) || null
	},

	/**
	 * Delete a single character by ID from LocalStorage.
	 */
	deleteById(id: string): boolean {
		const characters = this.getAll()
		const filtered = characters.filter((c) => c.id !== id)
		return this.saveAll(filtered)
	},

	/**
	 * Clear all stored characters (useful for testing resets).
	 */
	clearAll(): void {
		try {
			localStorage.removeItem(STORAGE_KEY)
		} catch (error) {
			console.error('Failed to clear character storage:', error)
		}
	},
}
