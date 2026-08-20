import { TEXT } from '@/constants'
import type { CombatPhase } from '@/types'
import { cn } from '@/utils'

interface EncounterActionsSectionProps {
	combatPhase: CombatPhase | null
	handleFight: () => void
	handleRun: () => void
}

export const EncounterActionsSection = ({
	combatPhase,
	handleFight,
	handleRun,
}: EncounterActionsSectionProps) => {
	return (
		<div className='flex items-center justify-between rounded border border-slate-800 bg-slate-900 p-2'>
			<span className={cn(TEXT.label, 'text-slate-300')}>Party Command:</span>
			{combatPhase == 'INIT' && (
				<div className='flex gap-2'>
					<button
						onClick={handleFight}
						className='rounded bg-amber-600 px-3 py-1 font-mono text-xs font-bold text-slate-950 transition-colors hover:bg-amber-500'
					>
						[F] Fight
					</button>
					<button
						onClick={handleRun}
						className='rounded border border-slate-700 bg-slate-800 px-3 py-1 font-mono text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700'
					>
						[R] Run (100%)
					</button>
				</div>
			)}
		</div>
	)
}
