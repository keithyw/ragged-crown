import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES } from '@/constants'

interface PostCombatViewProps {
	onContinue: () => void
}

export const PostCombatView = ({ onContinue }: PostCombatViewProps) => {
	return (
		<div className={`${SHAPES.panel} ${SURFACES.panelDark}`}>
			<PanelHeader title='Victory!' subtitle='Encounter Cleared' />

			<div className='flex flex-1 flex-col justify-between p-4 font-mono text-xs text-slate-300'>
				<div className='space-y-2'>
					<p className='font-bold text-amber-400'>&gt; Victory is yours!</p>
					<div className='space-y-1 rounded border border-slate-800 bg-slate-900 p-3 text-slate-500 italic'>
						<p>[ Experience Points: Placeholder (0 XP) ]</p>
						<p>[ Loot / Gold: Placeholder (0 Gold) ]</p>
					</div>
				</div>

				<button
					onClick={onContinue}
					className='w-full rounded bg-amber-600 py-2 font-mono font-bold text-slate-950 transition-colors hover:bg-amber-500'
				>
					[Press Space / Enter] Return to Map
				</button>
			</div>
		</div>
	)
}
