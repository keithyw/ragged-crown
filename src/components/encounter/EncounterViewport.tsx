import { EncounterActionsSection } from '@/components/encounter/EncounterActionsSection'
import { MonsterGroupSection } from '@/components/encounter/MonsterGroupSection'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES } from '@/constants'
import { getGameEngine } from '@/engine/GameEngine'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/utils'

export const EncounterViewport = () => {
	const activeEncounter = useGameStore((state) => state.encounter)
	const combatPhase = useGameStore((state) => state.combatPhase)

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
		getGameEngine().fleeCombat()
	}

	const handleFight = () => {
		getGameEngine().startCombat()
	}

	return (
		<div className={cn(SHAPES.panel, SURFACES.panelDark)}>
			<PanelHeader
				title='Combat Encounter'
				subtitle={`Danger Level ${activeEncounter.dangerLevel}`}
			/>

			<div className='flex flex-1 flex-col justify-between gap-3 overflow-hidden p-3'>
				<MonsterGroupSection
					activeEncounter={activeEncounter}
					leadGroup={leadGroup}
				/>

				{/* Bottom Half: Phase 1 Action Options */}
				<EncounterActionsSection
					combatPhase={combatPhase}
					handleFight={handleFight}
					handleRun={handleRun}
				/>
			</div>
		</div>
	)
}
