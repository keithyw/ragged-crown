import { CharacterAttributesStep } from '@/components/characterCreation/CharacterAttributesStep'
import { CharacterGenderStep } from '@/components/characterCreation/CharacterGenderStep'
import { CharacterNameStep } from '@/components/characterCreation/CharacterNameStep'
import { CharacterPreviewPanel } from '@/components/characterCreation/CharacterPreviewPanel'
import { SaveConfirmationModal } from '@/components/characterCreation/SaveConfirmationModal'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'

export const CharacterCreationScreen = () => {
	const currentStep = useCharacterCreationStore((state) => state.currentStep)
	const prevStep = useCharacterCreationStore((state) => state.prevStep)
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
			<div className='mb-8 text-center'>
				<h1 className='text-3xl font-extrabold tracking-wider text-amber-500'>
					CHARACTER CREATION
				</h1>
				<p className='mt-1 text-xs text-slate-500 uppercase'>
					Step {currentStep + 1}: Identity
				</p>
			</div>
			<div className='flex w-full max-w-4xl items-start justify-center space-x-8'>
				<CharacterPreviewPanel />
				<div className='max-w-md flex-1 pt-2'>
					{currentStep === 0 && (
						<CharacterNameStep
							existingNames={existingNames}
							onCancel={handleCancel}
						/>
					)}
					{currentStep === 1 && <CharacterGenderStep onCancel={handleCancel} />}
					{currentStep === 2 && (
						<CharacterAttributesStep onCancel={handleCancel} />
					)}
					{currentStep === 3 && <SaveConfirmationModal onCancel={prevStep} />}
				</div>
			</div>
		</div>
	)
}
