import { create } from 'zustand'
import { DEFAULT_ATTRIBUTES, DEFAULT_HP, DEFAULT_SP } from '@/constants'
import type { PlayerCharacter } from '@/types'

interface DraftCharacterState {
	createdCharacters: PlayerCharacter[]
	currentStep: number
	draft: Partial<PlayerCharacter>

	// Actions
	setStep: (step: number) => void
	nextStep: () => void
	prevStep: () => void
	addCreatedCharacter: (character: PlayerCharacter) => void
	findCharacterById: (id: string) => PlayerCharacter | null
	removeCreatedCharacter: (character: PlayerCharacter) => void
	saveDraftCharacter: () => void
	setCreatedCharacters: (characters: PlayerCharacter[]) => void
	updateDraft: (updates: Partial<PlayerCharacter>) => void
	resetDraft: () => void
}

export const useCharacterCreationStore = create<DraftCharacterState>(
	(set, get) => ({
		createdCharacters: [],
		currentStep: 0,
		draft: {
			name: '',
			gender: 'male',
			race: 'human',
			level: 0,
			hp: { current: 10, max: 10 },
			sp: { current: 0, max: 0 },
			attributes: DEFAULT_ATTRIBUTES,
			debuffs: [],
		},

		setStep: (step) => set({ currentStep: Math.max(0, step) }),
		nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
		prevStep: () =>
			set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

		addCreatedCharacter: (character) =>
			set((state) => ({
				createdCharacters: [...state.createdCharacters, character],
			})),

		findCharacterById: (id) =>
			get().createdCharacters.find((c) => c.id === id) || null,

		removeCreatedCharacter: (character) =>
			set((state) => ({
				createdCharacters: state.createdCharacters.filter(
					(c) => c.id !== character.id,
				),
			})),

		// might deprecate this since CharacterEngine has a similar
		// function
		saveDraftCharacter: () => {
			const { draft } = get()

			// perhaps create a draft character function
			// because i don't like hard coded data in
			// functions like this
			const completedCharacter: PlayerCharacter = {
				id: `pc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
				name: draft.name?.trim() || 'Hero',
				gender: draft.gender || 'male',
				race: draft.race || 'human',
				level: 0,
				hp: { current: 10, max: 10 },
				sp: { current: 0, max: 0 },
				attributes: draft.attributes || DEFAULT_ATTRIBUTES,
				order: 0,
				debuffs: [],
			}

			set((state) => ({
				createdCharacters: [...state.createdCharacters, completedCharacter],
			}))

			get().resetDraft()
		},

		setCreatedCharacters: (characters) =>
			set({ createdCharacters: characters }),

		updateDraft: (updates) =>
			set((state) => ({
				draft: { ...state.draft, ...updates },
			})),

		resetDraft: () =>
			set({
				currentStep: 0,
				draft: {
					name: '',
					gender: 'male',
					race: 'human',
					level: 0,
					hp: { current: DEFAULT_HP, max: DEFAULT_HP },
					sp: { current: DEFAULT_SP, max: DEFAULT_SP },
					attributes: DEFAULT_ATTRIBUTES,
					debuffs: [],
				},
			}),
	}),
)
