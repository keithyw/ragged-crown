import { SAVED_GAMES_KEY } from '@/constants'
import type { SaveGameDocument } from '@/types'

export const SaveGameService = {
	getAll(): SaveGameDocument[] {
		const data = localStorage.getItem(SAVED_GAMES_KEY)
		if (!data) return []
		return JSON.parse(data) as SaveGameDocument[]
	},

	saveGame(game: SaveGameDocument): boolean {
		try {
			const games = this.getAll()
			const existingIndex = games.findIndex(
				(g) => g.metadata.id === game.metadata.id,
			)
			if (existingIndex >= 0) {
				games[existingIndex] = game
			} else {
				games.push(game)
			}
			localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games))
			return true
		} catch (e) {
			console.error('Failed to save game:', e)
			return false
		}
	},
}
