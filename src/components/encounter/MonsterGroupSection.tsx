import type { ActiveEncounter, MonsterGroup } from '@/types'

interface MonsterGroupSectionProps {
	activeEncounter: ActiveEncounter
	leadGroup: MonsterGroup
}

export const MonsterGroupSection = ({
	activeEncounter,
	leadGroup,
}: MonsterGroupSectionProps) => {
	return (
		<div className='flex items-start gap-4'>
			{/* Lead Monster Portrait Box */}
			<div className='flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded border-2 border-amber-500/50 bg-slate-900'>
				<span className='font-mono text-3xl font-bold text-amber-400'>
					{leadGroup.name.charAt(0)}
				</span>
				<span className='mt-1 max-w-20 truncate font-mono text-[10px] text-slate-400'>
					{leadGroup.name}
				</span>
			</div>

			{/* Monster Roster Split by Distance */}
			<div className='flex-1 space-y-2 font-mono text-xs'>
				<div className='border-b border-slate-800 pb-1 font-bold text-amber-400'>
					MELEE RANGE
				</div>
				{activeEncounter.groups
					.filter((g) => g.inMeleeRange)
					.map((group, idx) => {
						const aliveCount = group.monsters.filter(
							(m) => m.hp.current > 0,
						).length
						if (aliveCount === 0) return null
						return (
							<div key={idx} className='flex justify-between text-slate-200'>
								<span>
									{aliveCount}x {group.name}
								</span>
								<span className='text-[10px] text-slate-500'>[Melee]</span>
							</div>
						)
					})}

				<div className='border-b border-slate-800 pt-2 pb-1 font-bold text-cyan-400'>
					RANGED / DISTANT
				</div>
				{activeEncounter.groups.filter((g) => !g.inMeleeRange).length === 0 ? (
					<div className='text-[11px] text-slate-600 italic'>None</div>
				) : (
					activeEncounter.groups
						.filter((g) => !g.inMeleeRange)
						.map((group, idx) => {
							const aliveCount = group.monsters.filter(
								(m) => m.hp.current > 0,
							).length
							if (aliveCount === 0) return null
							return (
								<div key={idx} className='flex justify-between text-slate-300'>
									<span>
										{aliveCount}x {group.name}
									</span>
									<span className='text-[10px] text-slate-500'>[Distant]</span>
								</div>
							)
						})
				)}
			</div>
		</div>
	)
}
