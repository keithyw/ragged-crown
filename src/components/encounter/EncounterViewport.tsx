// src/components/encounter/EncounterViewport.tsx
import React from 'react'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES, TEXT } from '@/constants'
import { useGameStore } from '@/store/useGameStore'
import { getGameEngine } from '@/engine/GameEngine'
import { cn } from '@/utils'

export const EncounterViewport: React.FC = () => {
	const activeEncounter = useGameStore((state) => state.encounter)
	const addLog = useGameStore((state) => state.addLog)

	if (!activeEncounter) {
		return (
			<div
				className={cn(
					SHAPES.panel,
					SURFACES.panelDark,
					'items-center justify-center text-xs text-slate-600 italic',
				)}
			>
				[ Exploration Mode - Area Peaceful ]
			</div>
		)
	}

	const leadGroup = activeEncounter.groups[0]

	const handleRun = () => {
		addLog('> The party turned and successfully fled from combat!')
		useGameStore.setState({ encounter: null })
		getGameEngine().setScreenContext('WORLD_MAP')
	}

	const handleFight = () => {
		addLog('> Fight chosen! (Planning Phase coming soon...)')
	}

	return (
		<div className={cn(SHAPES.panel, SURFACES.panelDark)}>
			<PanelHeader
				title='Combat Encounter'
				subtitle={`Danger Level ${activeEncounter.dangerLevel}`}
			/>

			<div className='flex flex-1 flex-col justify-between gap-3 overflow-hidden p-3'>
				{/* Top Half: M&M2 Style Portrait + Monster List */}
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
							.map((group, idx) => (
								<div key={idx} className='flex justify-between text-slate-200'>
									<span>
										{group.count}x {group.name}
									</span>
									<span className='text-[10px] text-slate-500'>[Melee]</span>
								</div>
							))}

						<div className='border-b border-slate-800 pt-2 pb-1 font-bold text-cyan-400'>
							RANGED / DISTANT
						</div>
						{activeEncounter.groups.filter((g) => !g.inMeleeRange).length ===
						0 ? (
							<div className='text-[11px] text-slate-600 italic'>None</div>
						) : (
							activeEncounter.groups
								.filter((g) => !g.inMeleeRange)
								.map((group, idx) => (
									<div
										key={idx}
										className='flex justify-between text-slate-300'
									>
										<span>
											{group.count}x {group.name}
										</span>
										<span className='text-[10px] text-slate-500'>
											[Distant]
										</span>
									</div>
								))
						)}
					</div>
				</div>

				{/* Bottom Half: Phase 1 Action Options */}
				<div className='flex items-center justify-between rounded border border-slate-800 bg-slate-900 p-2'>
					<span className={cn(TEXT.label, 'text-slate-300')}>
						Party Command:
					</span>
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
				</div>
			</div>
		</div>
	)
}
