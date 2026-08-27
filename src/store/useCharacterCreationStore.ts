import { create } from 'zustand'
import type { Attributes, PlayerCharacter } from '@/types'

// might want to store these elsewhere eventually
// also, these might only be for humans. we might
// want a different set of default attributes for
// other races
// and we might want to place this either in a json
// file or somewhere we can retrieve them as a reference
// point
const DEFAULT_ATTRIBUTES: Attributes = {
	strength: 10,
	dexterity: 10,
	intelligence: 10,
	wisdom: 10,
	personality: 10,
	speed: 10,
	constitution: 10,
}

interface DraftCharacterState {
	createdCharacters: PlayerCharacter[]
	currentStep: number
	draft: Partial<PlayerCharacter>

	// Actions
	setStep: (step: number) => void
	nextStep: () => void
	prevStep: () => void
	updateDraft: (updates: Partial<PlayerCharacter>) => void
	resetDraft: () => void
}

export const useCharacterCreationStore = create<DraftCharacterState>((set) => ({
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
				hp: { current: 10, max: 10 },
				sp: { current: 0, max: 0 },
				attributes: DEFAULT_ATTRIBUTES,
				debuffs: [],
			},
		}),
}))
