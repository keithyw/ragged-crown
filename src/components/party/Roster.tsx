import { CharacterCard } from '@/components/party/CharacterCard'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES } from '@/constants'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/utils'

export const PartyRoster = () => {
	const party = useGameStore((state) => state.party)

	// Sort party by order rank
	const sortedParty = [...party].sort((a, b) => a.order - b.order)

	return (
		<div className={cn(SHAPES.panel, SURFACES.panelDark)}>
			<PanelHeader title='Party Roster' subtitle={`${party.length} Members`} />

			<div className='flex-1 scrollbar-thin scrollbar-thumb-slate-800 space-y-2 overflow-y-auto p-2'>
				{sortedParty.length === 0 ? (
					<div className='p-2 text-xs text-slate-600 italic'>
						No party members...
					</div>
				) : (
					sortedParty.map((char) => (
						<CharacterCard key={char.id} playerCharacter={char} />
					))
				)}
			</div>
		</div>
	)
}
