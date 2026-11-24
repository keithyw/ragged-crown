import { CharacterStorageService } from '@/services'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { DEFAULT_ATTRIBUTES } from '@/constants'
import type { PlayerCharacter } from '@/types'
import { generateCharacterId, maxHitPoints } from '@/utils'

export class CharacterEngine {
	public removeCharacter(character: PlayerCharacter): void {
		useCharacterCreationStore.getState().removeCreatedCharacter(character)
		CharacterStorageService.deleteById(character.id)
	}

	public saveCharacter(): void {
		const store = useCharacterCreationStore.getState()
		let character = store.draft
		if (!character) return
		// Hit points come from the attributes ([Attributes 4]), not from the draft.
		const max = maxHitPoints(character.attributes ?? DEFAULT_ATTRIBUTES)
		character = {
			...character,
			id: generateCharacterId(),
			order: 0,
			hp: { current: max, max },
		}
		store.addCreatedCharacter(character as PlayerCharacter)
		CharacterStorageService.saveCharacter(character as PlayerCharacter)
		store.resetDraft()
	}
}

let instance: CharacterEngine | null = null
export const getCharacterEngine = (): CharacterEngine => {
	if (!instance) instance = new CharacterEngine()
	return instance
}
