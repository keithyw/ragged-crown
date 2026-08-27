// src/components/characterCreation/CharacterNameStep.tsx
import { useState } from 'react'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { validateCharacterName } from '@/utils/validation'

interface CharacterNameStepProps {
	existingNames: string[]
	onCancel: () => void
}

export const CharacterNameStep = ({
	existingNames,
	onCancel,
}: CharacterNameStepProps) => {
	const draftName = useCharacterCreationStore((state) => state.draft.name || '')
	const updateDraft = useCharacterCreationStore((state) => state.updateDraft)
	const nextStep = useCharacterCreationStore((state) => state.nextStep)
	const [error, setError] = useState<string | null>(null)

	const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newName = e.target.value
		updateDraft({ name: newName })
		if (error) setError(null)
	}

	const handleSubmit = (e: React.SubmitEvent) => {
		e.preventDefault()
		const validation = validateCharacterName(draftName, existingNames)

		if (!validation.isValid) {
			setError(validation.error || 'Invalid name.')
			return
		}

		setError(null)
		nextStep()
	}

	return (
		<form onSubmit={handleSubmit} className='w-full max-w-md space-y-4'>
			<div className='flex flex-col space-y-2'>
				<label
					htmlFor='charName'
					className='text-xs font-bold tracking-wider text-slate-400 uppercase'
				>
					Enter Character Name (2-20 Characters):
				</label>
				<input
					id='charName'
					type='text'
					value={draftName}
					maxLength={20}
					onChange={handleNameChange}
					placeholder='e.g., Valen'
					autoFocus
					className='w-full rounded border border-slate-700 bg-slate-900 p-3 text-sm font-bold text-amber-300 placeholder-slate-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none'
				/>
			</div>

			{/* Validation Error Feedback */}
			{error && (
				<div className='rounded border border-rose-500/40 bg-rose-950/30 p-2 text-center text-xs font-semibold text-rose-400'>
					{error}
				</div>
			)}

			{/* Action Controls */}
			<div className='flex space-x-3 pt-2'>
				<button
					type='button'
					onClick={onCancel}
					className='w-1/2 rounded border border-slate-700 bg-slate-900 p-2 text-xs font-bold text-slate-400 hover:border-slate-500 hover:text-slate-200'
				>
					[ ESC ] Cancel
				</button>
				<button
					type='submit'
					className='w-1/2 rounded border border-amber-500 bg-amber-950/50 p-2 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950'
				>
					[ ENTER ] Next
				</button>
			</div>
		</form>
	)
}
