import { TEXT } from '@/constants'
import type { PlayerCharacter } from '@/types'
import { cn } from '@/utils'

interface CharacterCardProps {
	playerCharacter: PlayerCharacter
}

export const CharacterCard = ({ playerCharacter }: CharacterCardProps) => {
	const {
		name,
		order,
		race,
		class: charClass,
		level,
		hp,
		sp,
		debuffs,
	} = playerCharacter

	const hpPercent = Math.max(0, Math.min(100, (hp.current / hp.max) * 100))
	const spPercent =
		sp.max > 0 ? Math.max(0, Math.min(100, (sp.current / sp.max) * 100)) : 0

	return (
		<div className='flex flex-col gap-1.5 rounded border border-slate-800 bg-slate-900 p-2 text-slate-200'>
			{/* Top Bar: Order, Name, Class/Race */}
			<div className='flex items-center justify-between'>
				<div className='flex min-w-0 items-center gap-1.5'>
					<span
						className={cn(
							TEXT.monoBadge,
							'rounded bg-slate-800 px-1 py-0.5 text-amber-400',
						)}
					>
						#{order}
					</span>
					<span className='truncate text-xs font-semibold text-slate-100'>
						{name}
					</span>
				</div>
				<span className='font-mono text-[10px] text-slate-400 capitalize'>
					Lvl {level} {race} {charClass}
				</span>
			</div>

			{/* Main Content Row: Portrait Placeholder + Bars */}
			<div className='flex items-center gap-2'>
				{/* Class/Portrait Icon Placeholder */}
				<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded border border-slate-800 bg-slate-950 font-mono text-xs font-bold text-slate-500 uppercase select-none'>
					{charClass ? charClass.slice(0, 3) : 'N/C'}
				</div>

				{/* Resource Gauges */}
				<div className='flex-1 space-y-1 font-mono text-[10px]'>
					{/* Health Bar */}
					<div>
						<div className='mb-0.5 flex justify-between text-slate-400'>
							<span>HP</span>
							<span
								className={
									hp.current < hp.max * 0.3 ? 'font-bold text-red-400' : ''
								}
							>
								{hp.current}/{hp.max}
							</span>
						</div>
						<div className='h-1.5 w-full overflow-hidden rounded-full bg-slate-950'>
							<div
								className={cn(
									'h-full transition-all duration-300',
									hpPercent > 50
										? 'bg-emerald-500'
										: hpPercent > 25
											? 'bg-amber-500'
											: 'bg-red-500',
								)}
								style={{ width: `${hpPercent}%` }}
							/>
						</div>
					</div>

					{/* Spell Points Bar (Only if max > 0) */}
					{sp.max > 0 && (
						<div>
							<div className='mb-0.5 flex justify-between text-slate-400'>
								<span>SP</span>
								<span>
									{sp.current}/{sp.max}
								</span>
							</div>
							<div className='h-1.5 w-full overflow-hidden rounded-full bg-slate-950'>
								<div
									className='h-full bg-cyan-500 transition-all duration-300'
									style={{ width: `${spPercent}%` }}
								/>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Debuffs List */}
			{debuffs.length > 0 && (
				<div className='mt-0.5 flex flex-wrap gap-1'>
					{debuffs.map((debuff) => (
						<span
							key={debuff}
							className='rounded border border-red-800/50 bg-red-950/80 px-1 font-mono text-[9px] text-red-400 uppercase'
						>
							{debuff}
						</span>
					))}
				</div>
			)}
		</div>
	)
}
