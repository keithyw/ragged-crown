import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'

export const CharacterPreviewPanel = () => {
	const draft = useCharacterCreationStore((state) => state.draft)
	const attributes = draft.attributes

	return (
		<div className='flex w-full max-w-xs flex-col space-y-4 rounded border border-amber-600/40 bg-slate-900/80 p-5 font-mono text-slate-200 shadow-lg'>
			{/* Panel Header */}
			<div className='border-b border-slate-700 pb-2 text-center'>
				<h3 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					DRAFT CHARACTER
				</h3>
			</div>

			{/* Character Portrait Placeholder & Basic Info */}
			<div className='space-y-2'>
				<div className='flex items-center space-x-2'>
					<span className='text-xs font-bold text-slate-500 uppercase'>
						NAME:
					</span>
					<span className='text-sm font-bold text-amber-300'>
						{draft.name?.trim() || '—'}
					</span>
				</div>

				<div className='flex items-center space-x-2 text-xs'>
					<span className='font-bold text-slate-500 uppercase'>GENDER:</span>
					<span className='text-slate-300 capitalize'>
						{draft.gender || '—'}
					</span>
				</div>

				<div className='flex items-center space-x-2 text-xs'>
					<span className='font-bold text-slate-500 uppercase'>RACE:</span>
					<span className='text-slate-300 capitalize'>
						{draft.race || 'Human'}
					</span>
				</div>

				<div className='flex items-center space-x-2 text-xs'>
					<span className='font-bold text-slate-500 uppercase'>LEVEL:</span>
					<span className='text-slate-300'>{draft.level ?? 0}</span>
				</div>
			</div>

			{/* Attributes Section */}
			{attributes && (
				<div className='space-y-1.5 border-t border-slate-800 pt-3'>
					<div className='mb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase'>
						ATTRIBUTES
					</div>
					{Object.entries(attributes).map(([key, val]) => (
						<div key={key} className='flex justify-between text-xs'>
							<span className='text-slate-400 uppercase'>{key}:</span>
							<span className='font-bold text-amber-400/90'>{val}</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
