import type { PlayerCharacter } from '@/types'

interface RosterListPanelProps {
	title: string
	characters: PlayerCharacter[]
	activePartyIds: Set<string>
	selectedIndex: number
	isFocused: boolean
	onSelectIndex: (index: number) => void
}

export const RosterListPanel = ({
	title,
	characters,
	activePartyIds,
	selectedIndex,
	isFocused,
	onSelectIndex,
}: RosterListPanelProps) => {
	return (
		<div
			className={`flex flex-1 flex-col rounded border p-4 font-mono transition-colors ${
				isFocused
					? 'border-amber-500 bg-slate-900/90 shadow-md'
					: 'border-slate-800 bg-slate-900/40 opacity-70'
			}`}
		>
			{/* Panel Header */}
			<div className='mb-3 flex items-center justify-between border-b border-slate-800 pb-2'>
				<h2 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					{title} ({characters.length})
				</h2>
				{isFocused && (
					<span className='animate-pulse text-[10px] font-bold text-amber-400'>
						[ACTIVE PANEL]
					</span>
				)}
			</div>

			{/* Character List */}
			<div className='flex-1 space-y-1.5 overflow-y-auto'>
				{characters.length === 0 ? (
					<div className='flex h-32 items-center justify-center text-xs text-slate-600 italic'>
						No characters available
					</div>
				) : (
					characters.map((char, idx) => {
						const isSelected = isFocused && idx === selectedIndex
						const isInParty = activePartyIds.has(char.id)

						return (
							<div
								key={char.id}
								onClick={() => onSelectIndex(idx)}
								className={`flex cursor-pointer items-center justify-between rounded border p-2 text-xs transition-all ${
									isSelected
										? 'border-amber-400 bg-amber-950/30 text-slate-100'
										: 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
								}`}
							>
								<div className='flex items-center space-x-2'>
									<span className='w-3 text-amber-500'>
										{isSelected ? '►' : ' '}
									</span>
									<span className='font-bold text-slate-200'>{char.name}</span>
									<span className='text-[10px] text-slate-500'>
										(Lvl {char.level} {char.gender})
									</span>
								</div>

								{/* Party Member Status Indicator */}
								<div>
									{isInParty ? (
										<span className='rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400'>
											[✓ IN PARTY]
										</span>
									) : (
										<span className='text-[10px] text-slate-600'>
											[ BENCH ]
										</span>
									)}
								</div>
							</div>
						)
					})
				)}
			</div>
		</div>
	)
}
