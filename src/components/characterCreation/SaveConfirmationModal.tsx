import { useCallback, useEffect } from 'react'
import { inputManager } from '@/engine'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'

interface SaveConfirmationModalProps {
	onCancel: () => void
}

export const SaveConfirmationModal = ({
	onCancel,
}: SaveConfirmationModalProps) => {
	const draft = useCharacterCreationStore((state) => state.draft)
	const saveDraftCharacter = useCharacterCreationStore(
		(state) => state.saveDraftCharacter,
	)

	const handleSaveAndExit = useCallback(() => {
		saveDraftCharacter()
		const store = useGameStore.getState()
		store.setScreen('MAIN_MENU')
	}, [saveDraftCharacter])

	const handleSaveAndCreateAnother = useCallback(() => {
		saveDraftCharacter() // Resets draft back to step 0 automatically
	}, [saveDraftCharacter])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			if (key === '1' || k === 'm') {
				handleSaveAndExit()
				return true
			}
			if (key === '2' || k === 'a') {
				handleSaveAndCreateAnother()
				return true
			}
			if (key === 'Escape' || k === 'c') {
				onCancel()
				return true
			}

			return false
		})

		return () => unbind()
	}, [handleSaveAndExit, handleSaveAndCreateAnother, onCancel])

	return (
		<div className='fixed inset-0 flex items-center justify-center bg-slate-950/80 font-mono backdrop-blur-sm'>
			<div className='w-full max-w-md space-y-6 rounded border border-amber-500 bg-slate-900 p-6 shadow-2xl'>
				<div className='space-y-1 text-center'>
					<h3 className='text-lg font-extrabold tracking-wider text-amber-500'>
						CHARACTER COMPLETE
					</h3>
					<p className='text-xs text-slate-300'>
						Save <span className='font-bold text-amber-300'>{draft.name}</span>{' '}
						to roster?
					</p>
				</div>

				<div className='space-y-3 pt-2'>
					<button
						type='button'
						onClick={handleSaveAndExit}
						className='w-full rounded border border-amber-500 bg-amber-950/40 p-3 text-xs font-bold text-amber-300 hover:bg-amber-500 hover:text-slate-950'
					>
						[ 1 ] Save & Return to Main Menu
					</button>

					<button
						type='button'
						onClick={handleSaveAndCreateAnother}
						className='w-full rounded border border-slate-700 bg-slate-800 p-3 text-xs font-bold text-slate-200 hover:border-slate-500'
					>
						[ 2 ] Save & Create Another Character
					</button>

					<button
						type='button'
						onClick={onCancel}
						className='w-full rounded border border-slate-800 bg-slate-900 p-2 text-xs font-bold text-slate-500 hover:text-slate-300'
					>
						[ ESC ] Cancel (Return to Editing)
					</button>
				</div>
			</div>
		</div>
	)
}
