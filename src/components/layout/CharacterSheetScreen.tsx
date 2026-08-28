import { useCallback, useEffect, useState } from 'react'
import { inputManager, getGameEngine } from '@/engine'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'

export const CharacterSheetScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)
	const inspectedId = useGameStore((state) => state.inspectedCharacterId)
	const context = useGameStore((state) => state.inspectedContext)

	const createdCharacters = useCharacterCreationStore(
		(state) => state.createdCharacters,
	)
	// const deleteCreatedCharacter = useCharacterCreationStore(
	// 	(state) => state.deleteCreatedCharacter,
	// )

	const character = createdCharacters.find((c) => c.id === inspectedId)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const handleBack = useCallback(() => {
		if (context === 'GUILD') {
			// this might be wrong because of key bindings
			getGameEngine().enterPartyRosterMode()
		} else {
			setScreen('MAIN_MENU') // Fallback return route
		}
	}, [context, setScreen])

	const handleDelete = useCallback(() => {
		if (character) {
			// deleteCreatedCharacter(character.id)
			handleBack()
		}
	}, [character, handleBack])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			if (showDeleteConfirm) {
				if (k === 'y') {
					handleDelete()
					return true
				}
				if (k === 'n' || key === 'Escape') {
					setShowDeleteConfirm(false)
					return true
				}
				return false
			}

			if (key === 'Escape') {
				handleBack()
				return true
			}

			if (context === 'GUILD' && (key === 'Delete' || k === 'x')) {
				setShowDeleteConfirm(true)
				return true
			}

			return false
		})

		return () => unbind()
	}, [handleBack, handleDelete, character, context, showDeleteConfirm])

	if (!character) {
		return (
			<div className='flex min-h-screen flex-col items-center justify-center border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
				<p className='text-sm text-slate-400'>Character record not found.</p>
				<button
					type='button'
					onClick={handleBack}
					className='mt-4 rounded border border-amber-500 bg-amber-950/40 px-4 py-2 text-xs font-bold text-amber-300'
				>
					Return
				</button>
			</div>
		)
	}

	return (
		<div className='flex min-h-screen flex-col justify-between border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
			{/* Top Bar / Navigation Header */}
			<div className='flex items-center justify-between border-b border-slate-800 pb-4'>
				<div>
					<h1 className='text-3xl font-extrabold tracking-wider text-amber-500'>
						{character.name}
					</h1>
					<p className='mt-1 text-xs text-slate-500 uppercase'>
						Level {character.level} • {character.gender} • {character.race}
					</p>
				</div>
				<button
					type='button'
					onClick={handleBack}
					className='rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-500'
				>
					[ ESC ] Back
				</button>
			</div>

			{/* Primary Content Grid */}
			<div className='my-6 grid flex-1 grid-cols-12 gap-6'>
				{/* Left Column: Vitals & Base Stats */}
				<div className='col-span-4 space-y-4 rounded border border-slate-800 bg-slate-900/40 p-5'>
					<h3 className='border-b border-slate-800 pb-2 text-xs font-bold tracking-widest text-amber-500 uppercase'>
						Vitals & Attributes
					</h3>

					<div className='space-y-2 text-xs'>
						<div className='flex justify-between border-b border-slate-800/60 pb-1'>
							<span className='text-slate-500'>HEALTH:</span>
							<span className='font-bold text-emerald-400'>
								{character.hp.current} / {character.hp.max}
							</span>
						</div>
						<div className='flex justify-between border-b border-slate-800/60 pb-1'>
							<span className='text-slate-500'>SPELL POINTS:</span>
							<span className='font-bold text-sky-400'>
								{character.sp.current} / {character.sp.max}
							</span>
						</div>
					</div>

					<div className='space-y-1.5 pt-2 text-xs'>
						{Object.entries(character.attributes).map(([stat, val]) => (
							<div
								key={stat}
								className='flex justify-between rounded border border-slate-800 bg-slate-950/60 p-2'
							>
								<span className='text-slate-400 uppercase'>{stat}:</span>
								<span className='font-bold text-amber-400'>{val}</span>
							</div>
						))}
					</div>
				</div>

				{/* Right Column: Reserved for Inventory, Equipment & Spells */}
				<div className='col-span-8 flex items-center justify-center rounded border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center'>
					<div className='space-y-2 text-slate-600'>
						<p className='text-sm font-bold tracking-widest text-slate-500 uppercase'>
							[ EQUIPMENT & INVENTORY MODULE ]
						</p>
						<p className='text-xs'>
							Future space for gear paperdoll, bag slots, encumbrance, and
							spellbooks.
						</p>
					</div>
				</div>
			</div>

			{/* Footer / Action Bar */}
			<div className='flex items-center justify-between border-t border-slate-800 pt-4'>
				{context === 'GUILD' ? (
					<button
						type='button'
						onClick={() => setShowDeleteConfirm(true)}
						className='rounded border border-rose-900 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900 hover:text-slate-100'
					>
						[ DEL / X ] Delete Character
					</button>
				) : (
					<div />
				)}

				<div className='text-xs text-slate-500'>[ESC] Return to Roster</div>
			</div>

			{/* Confirmation Dialog Overlay */}
			{showDeleteConfirm && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 font-mono'>
					<div className='w-full max-w-md space-y-4 rounded border border-rose-500 bg-slate-900 p-6 text-center shadow-2xl'>
						<h4 className='text-sm font-bold tracking-wider text-rose-500 uppercase'>
							PERMANENTLY DELETE CHARACTER?
						</h4>
						<p className='text-xs text-slate-300'>
							Are you sure you want to delete{' '}
							<span className='font-bold text-amber-400'>{character.name}</span>
							? This cannot be undone.
						</p>
						<div className='flex justify-center space-x-4 pt-2'>
							<button
								type='button'
								onClick={handleDelete}
								className='rounded border border-rose-500 bg-rose-950 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-slate-950'
							>
								[ Y ] Yes, Delete
							</button>
							<button
								type='button'
								onClick={() => setShowDeleteConfirm(false)}
								className='rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-500'
							>
								[ N / ESC ] Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
