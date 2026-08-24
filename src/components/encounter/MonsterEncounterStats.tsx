import { TEXT } from '@/constants'
import type { ActiveMonster } from '@/types'
import { calculateHPPercent, cn } from '@/utils'

interface MonsterEncounterStatsProps {
	monster: ActiveMonster
	midx: number
}

export const MonsterEncounterStats = ({
	monster,
	midx,
}: MonsterEncounterStatsProps) => {
	const isAlive = monster.hp.current > 0
	const hpPercent = calculateHPPercent(monster.hp.current, monster.hp.max)
	return (
		<div
			key={monster.id}
			className={cn(
				'flex items-center justify-between rounded bg-slate-800/40 p-1.5 text-xs',
			)}
		>
			<div className='flex items-center gap-2'>
				<span className='font-mono text-[10px] text-slate-500'>
					[{midx + 1}]
				</span>
				<span
					className={cn(isAlive ? TEXT.hpAlive : [TEXT.hpDead, 'line-through'])}
				>
					{monster.name}
				</span>
			</div>

			<div className='flex items-center gap-3'>
				<span
					className={cn(
						'rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase',
						isAlive
							? 'borger-emerald-800 border bg-emerald-950 text-emerald-400'
							: 'border border-red-800 bg-red-950 text-red-400',
					)}
				>
					{isAlive ? 'OK' : 'Dead'}
				</span>
				<div className='h-2 w-20 overflow-hidden rounded-full bg-slate-950'>
					<div
						className={cn(
							'h-full transition-all duration-300',
							hpPercent > 50
								? TEXT.hpPercentGood
								: hpPercent > 20
									? TEXT.hpPercentWarning
									: TEXT.hpPercentBad,
						)}
						style={{ width: `${hpPercent}%` }}
					/>
				</div>
				<span className='w-12 text-right font-mono text-[10px] text-slate-400'>
					{monster.hp.current}/{monster.hp.max}
				</span>
			</div>
		</div>
	)
}
