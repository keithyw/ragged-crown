import { useGameStore } from '@/store/useGameStore'
import type { ActiveEncounter, MonsterGroup } from '@/types'
import { cn } from '@/utils'
import { MonsterEncounterStats } from './MonsterEncounterStats'

interface MonsterGroupSectionProps {
	activeEncounter: ActiveEncounter
	leadGroup: MonsterGroup
	selectedTargetIndex: number
}

export const MonsterGroupSection = ({
	activeEncounter,
	leadGroup,
	selectedTargetIndex,
}: MonsterGroupSectionProps) => {
	const subPhase = useGameStore((state) => state.subPhase)
	const isTargeting = subPhase === 'TARGET_SELECT'

	// Partition groups while preserving original array indices
	const indexedGroups = activeEncounter.groups.map((group, originalIndex) => ({
		group,
		originalIndex,
	}))

	const meleeGroups = indexedGroups.filter(({ group }) => group.inMeleeRange)
	const rangedGroups = indexedGroups.filter(({ group }) => !group.inMeleeRange)

	const renderGroup = (group: MonsterGroup, originalIndex: number) => {
		const isSelected = isTargeting && originalIndex === selectedTargetIndex

		return (
			<div
				key={group.id}
				className={cn(
					'rounded border p-2 transition-all',
					isSelected
						? 'border-amber-400 bg-amber-950/20 ring-1 ring-amber-400/50'
						: 'border-slate-800 bg-slate-900/60',
				)}
			>
				{group.monsters.map((monster, midx) => (
					<MonsterEncounterStats
						key={monster.id}
						monster={monster}
						midx={midx}
					/>
				))}
			</div>
		)
	}

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
				{meleeGroups.length === 0 ? (
					<div className='text-[11px] text-slate-600 italic'>None</div>
				) : (
					meleeGroups.map(({ group, originalIndex }) =>
						renderGroup(group, originalIndex),
					)
				)}

				<div className='border-b border-slate-800 pt-2 pb-1 font-bold text-cyan-400'>
					RANGED / DISTANT
				</div>
				{rangedGroups.length === 0 ? (
					<div className='text-[11px] text-slate-600 italic'>None</div>
				) : (
					rangedGroups.map(({ group, originalIndex }) =>
						renderGroup(group, originalIndex),
					)
				)}
			</div>
		</div>
	)
}
