import { combatEngine } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

/**
 * The popup shown when the whole party is down ([Combat 26]). Space (bound by
 * the combat engine, which ignores every other key) leaves for the main menu.
 */
export const GameOverView = () => {
	const slainBy = useGameStore((state) => state.slainBy)

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 font-mono backdrop-blur-sm'>
			<div className='w-full max-w-md space-y-5 rounded border border-red-500 bg-slate-900 p-6 shadow-2xl'>
				<div className='space-y-1 text-center'>
					<h3 className='text-lg font-extrabold tracking-wider text-red-500'>
						GAME OVER
					</h3>
					<p className='text-xs text-slate-400'>Your party has fallen.</p>
				</div>

				<div className='rounded border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200'>
					<p>
						You have been slain by{' '}
						<span className='font-bold text-red-300'>{slainBy}</span>.
					</p>
				</div>

				<button
					type='button'
					onClick={() => combatEngine.endGameOver()}
					className='w-full rounded bg-red-700 py-2 text-xs font-bold text-slate-50 transition-colors hover:bg-red-600'
				>
					[ SPACE ] Return to Main Menu
				</button>
			</div>
		</div>
	)
}
