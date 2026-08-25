import { TEXT } from '@/constants'
import { useGameStore } from '@/store/useGameStore'
import { SpellCaster, type CombatPhase, type PlayerCharacter } from '@/types'
import { cn } from '@/utils'

interface EncounterActionsSectionProps {
	activeCharacter: number | 0
	combatPhase: CombatPhase | null
	party: PlayerCharacter[] | null
	handleAction: (actionType: string) => void
	handleFight: () => void
	handleReset: () => void
	handleRun: () => void
}

export const EncounterActionsSection = ({
	activeCharacter,
	combatPhase,
	party,
	handleAction,
	handleFight,
	handleReset,
	handleRun,
}: EncounterActionsSectionProps) => {
	const currentCharacter = party ? party[activeCharacter] : null
	const encounter = useGameStore((state) => state.encounter)
	const subPhase = useGameStore((state) => state.subPhase)

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

			{combatPhase === 'PLANNING' && currentCharacter && (
				<>
					{subPhase === 'ACTION_SELECT' && (
						<div className='space-y-2'>
							<div className='flex items-center justify-between text-xs'>
								<span className='font-bold text-amber-400'>
									Command for #{currentCharacter.order} {currentCharacter.name}{' '}
									({currentCharacter.class}):
								</span>
								<span className='ml-2 text-[10px] text-slate-500'>
									Member {activeCharacter + 1} of {party?.length}
								</span>
							</div>
							<div className='flex gap-2 text-xs'>
								<button
									onClick={() => handleAction('a')}
									className='rounded bg-amber-600 px-3 py-1 font-bold text-slate-950 hover:bg-amber-500'
								>
									[A] Attack
								</button>
								<button
									onClick={() => handleAction('d')}
									className='rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-700'
								>
									[D] Defend
								</button>
								{SpellCaster.find(
									(c) => (c as string) === currentCharacter.class,
								) && (
									<button
										onClick={() => handleAction('c')}
										className='rounded bg-cyan-700 px-3 py-1 font-bold text-slate-100 hover:bg-cyan-600'
									>
										[C] Cast Spell
									</button>
								)}
							</div>
						</div>
					)}
					{subPhase === 'TARGET_SELECT' && (
						<div className='ml-4 flex w-full items-center justify-between'>
							<span className='animate-pulse font-bold text-amber-400'>
								&gt; Select Target Group [1-{encounter?.groups.length}]:
							</span>
							<div className='flex gap-2 font-mono text-[10px] text-slate-400'>
								<span className='rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-amber-300'>
									[↑/↓] Select Group
								</span>
								<span className='rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-emerald-300'>
									[Enter] Confirm
								</span>
								<span className='rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-rose-400'>
									[Esc] Cancel
								</span>
							</div>
						</div>
					)}
					{subPhase === 'SPELL_SELECT' && (
						<div className='ml-4 flex w-full items-center justify-between'>
							<span className='font-bold text-cyan-400'>
								&gt; Select Spell to Cast:
							</span>
							<span className='rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400'>
								[Esc] Cancel
							</span>
						</div>
					)}
				</>
			)}

			{combatPhase === 'CONFIRMATION' && (
				<div className='flex items-center justify-between text-xs'>
					<span className='font-bold text-emerald-400'>
						&gt; All actions queued. Confirm round?
					</span>
					<div className='flex gap-2'>
						<span className='rounded bg-emerald-600 px-3 py-1 font-bold text-slate-950'>
							[Enter] Execute
						</span>
						<button
							onClick={handleReset}
							className='rounded border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300'
						>
							[Backspace] Reset
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
