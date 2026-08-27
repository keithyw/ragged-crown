import { CharacterNameStep } from '@/components/characterCreation/CharacterNameStep'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'

export const CharacterCreationScreen = () => {
	const currentStep = useCharacterCreationStore((state) => state.currentStep)
	const resetDraft = useCharacterCreationStore((state) => state.resetDraft)

	const createdCharacters = useCharacterCreationStore(
		(state) => state.createdCharacters,
	)
	const existingNames = createdCharacters.map((c) => c.name)

	const handleCancel = () => {
		resetDraft()
		const store = useGameStore.getState()
		store.setScreen('MAIN_MENU')
	}

	return (
		<div className='flex min-h-screen flex-col items-center justify-center border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
			<div className='mb-6 text-center'>
				<h1 className='text-3xl font-extrabold tracking-wider text-amber-500'>
					CHARACTER CREATION
				</h1>
				<p className='mt-1 text-xs text-slate-500 uppercase'>
					Step {currentStep + 1}: Identity
				</p>
			</div>
			{currentStep === 0 && (
				<CharacterNameStep
					existingNames={existingNames}
					onCancel={handleCancel}
				/>
			)}
		</div>
	)
}
