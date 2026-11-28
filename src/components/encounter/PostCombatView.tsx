import { combatEngine } from '@/engine'
import { useGameStore } from '@/store/useGameStore'
import { currencyText } from '@/utils'

/**
 * The popup shown after a won fight: what the party earned ([Game 28]).
 * Enter or Space (bound by the combat engine) closes it and returns to the
 * map. Loot gets its own row here once it exists.
 */
export const PostCombatView = () => {
	const gains = useGameStore((state) => state.combatGains)
	const coins = currencyText(gains?.currency ?? {})

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 font-mono backdrop-blur-sm'>
			<div className='w-full max-w-md space-y-5 rounded border border-amber-500 bg-slate-900 p-6 shadow-2xl'>
				<div className='space-y-1 text-center'>
					<h3 className='text-lg font-extrabold tracking-wider text-amber-500'>
						VICTORY
					</h3>
					<p className='text-xs text-slate-400'>The party has earned:</p>
				</div>

				<div className='space-y-2 rounded border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200'>
					{gains && gains.xpEach > 0 ? (
						<>
							<p>
								Each surviving party member receives{' '}
								<span className='font-bold text-amber-300'>
									{gains.xpEach} XP
								</span>
							</p>
							<p className='text-slate-500'>{gains.recipients.join(', ')}</p>
						</>
					) : (
						<p className='text-slate-500'>No experience this time.</p>
					)}
					{coins && (
						<p>
							The party collects{' '}
							<span className='font-bold text-amber-300'>{coins}</span>
						</p>
					)}
				</div>

				<button
					type='button'
					onClick={() => combatEngine.finishCombat()}
					className='w-full rounded bg-amber-600 py-2 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-500'
				>
					[ SPACE / ENTER ] Return to Map
				</button>
			</div>
		</div>
	)
}
