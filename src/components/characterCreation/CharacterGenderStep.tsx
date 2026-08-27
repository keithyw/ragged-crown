import { useCallback, useEffect } from 'react'
import { inputManager } from '@/engine'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
// import type { GenderType } from '@/types'

interface CharacterGenderStepProps {
	onCancel: () => void
}

export const CharacterGenderStep = ({ onCancel }: CharacterGenderStepProps) => {
	const draftGender = useCharacterCreationStore(
		(state) => state.draft.gender || 'male',
	)
	const updateDraft = useCharacterCreationStore((state) => state.updateDraft)
	const nextStep = useCharacterCreationStore((state) => state.nextStep)
	const prevStep = useCharacterCreationStore((state) => state.prevStep)

	const handleToggle = useCallback(() => {
		const nextGender = draftGender === 'male' ? 'female' : 'male'
		updateDraft({ gender: nextGender })
	}, [draftGender, updateDraft])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			// Direct Hotkeys
			if (k === 'm') {
				updateDraft({ gender: 'male' })
				return true
			}
			if (k === 'f') {
				updateDraft({ gender: 'female' })
				return true
			}

			// Arrow Toggles
			if (
				key === 'ArrowLeft' ||
				key === 'ArrowRight' ||
				k === 'a' ||
				k === 'd'
			) {
				handleToggle()
				return true
			}

			// Advance (Strictly Enter)
			if (key === 'Enter') {
				nextStep()
				return true
			}

			return false
		})

		return () => unbind()
	}, [draftGender, handleToggle, nextStep, updateDraft])

	return (
		<div className='w-full max-w-md space-y-6 font-mono'>
			<div className='flex flex-col space-y-2'>
				<label className='text-xs font-bold tracking-wider text-slate-400 uppercase'>
					Select Character Gender:
				</label>

				<div className='flex items-center justify-between rounded border border-slate-700 bg-slate-900 p-4'>
					<button
						type='button'
						onClick={() => updateDraft({ gender: 'male' })}
						className={`flex-1 rounded py-2 text-center text-sm font-bold transition-colors ${
							draftGender === 'male'
								? 'bg-amber-500 text-slate-950'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						[ M ] MALE
					</button>
					<span className='px-3 text-slate-600'>|</span>
					<button
						type='button'
						onClick={() => updateDraft({ gender: 'female' })}
						className={`flex-1 rounded py-2 text-center text-sm font-bold transition-colors ${
							draftGender === 'female'
								? 'bg-amber-500 text-slate-950'
								: 'text-slate-400 hover:text-slate-200'
						}`}
					>
						[ F ] FEMALE
					</button>
				</div>
			</div>

			{/* Explicit Step Navigation Controls */}
			<div className='flex justify-between space-x-2 pt-2'>
				<button
					type='button'
					onClick={prevStep}
					className='w-1/3 rounded border border-slate-700 bg-slate-900 p-2 text-xs font-bold text-slate-400 hover:border-slate-500 hover:text-slate-200'
				>
					&lt; Back
				</button>
				<button
					type='button'
					onClick={onCancel}
					className='w-1/3 rounded border border-rose-950/60 bg-rose-950/20 p-2 text-xs font-bold text-rose-400 hover:border-rose-800 hover:bg-rose-950/40'
				>
					Cancel
				</button>
				<button
					type='button'
					onClick={nextStep}
					className='w-1/3 rounded border border-amber-500 bg-amber-950/50 p-2 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950'
				>
					[ ENTER ] Next
				</button>
			</div>

			<div className='text-center text-[11px] text-slate-500'>
				[M / F / ARROWS] Select • [ENTER] Continue
			</div>
		</div>
	)
}
