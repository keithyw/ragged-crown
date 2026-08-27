import { useEffect, useMemo, useState } from 'react'
import { inputManager } from '@/engine'
import { RosterListPanel } from '@/components/partyRoster/RosterListPanel'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useGameStore } from '@/store/useGameStore'
import type { PlayerCharacter } from '@/types'

type ActivePanel = 'custom' | 'npc'

export const PartyRosterScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)
	const customCharacters = useCharacterCreationStore(
		(state) => state.createdCharacters,
	)

	// Mock empty NPC array for now (ready for future hook-in)
	const recruitableNPCs = useMemo<PlayerCharacter[]>(() => [], [])

	// Active Party State (Set of character IDs currently in group)
	const [activePartyIds, setActivePartyIds] = useState<Set<string>>(new Set())

	// Focus & Selection Navigation
	const [activePanel, setActivePanel] = useState<ActivePanel>('custom')
	const [customIndex, setCustomIndex] = useState(0)
	const [npcIndex, setNpcIndex] = useState(0)

	const currentList =
		activePanel === 'custom' ? customCharacters : recruitableNPCs
	const currentIndex = activePanel === 'custom' ? customIndex : npcIndex
	const setIndex = activePanel === 'custom' ? setCustomIndex : setNpcIndex

	const togglePartyMember = (characterId: string) => {
		setActivePartyIds((prev) => {
			const next = new Set(prev)
			if (next.has(characterId)) {
				next.delete(characterId)
			} else {
				if (next.size >= 4) return prev // Cap party at 4 for starting scale
				next.add(characterId)
			}
			return next
		})
	}

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			// Column Switching
			if (key === 'ArrowLeft' || k === 'a') {
				setActivePanel('custom')
				return true
			}
			if (key === 'ArrowRight' || k === 'd') {
				setActivePanel('npc')
				return true
			}

			// Vertical Navigation
			if (key === 'ArrowUp' || k === 'w') {
				if (currentList.length > 0) {
					setIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1))
				}
				return true
			}
			if (key === 'ArrowDown' || k === 's') {
				if (currentList.length > 0) {
					setIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0))
				}
				return true
			}

			// Toggle Active Party Member
			if (key === ' ') {
				const currentChar = currentList[currentIndex]
				if (currentChar) {
					togglePartyMember(currentChar.id)
				}
				return true
			}

			// Exit to Main Menu
			if (key === 'Escape') {
				setScreen('MAIN_MENU')
				return true
			}

			return false
		})

		return () => unbind()
	}, [
		activePanel,
		currentIndex,
		currentList,
		customIndex,
		npcIndex,
		customCharacters,
		recruitableNPCs,
		setIndex,
		setScreen,
	])

	return (
		<div className='flex min-h-screen flex-col items-center justify-between border-4 border-slate-800 bg-slate-950 p-6 font-mono text-slate-100'>
			{/* Header */}
			<div className='mb-4 text-center'>
				<h1 className='text-2xl font-extrabold tracking-wider text-amber-500'>
					PARTY ROSTER MANAGEMENT
				</h1>
				<p className='mt-0.5 text-xs text-slate-500 uppercase'>
					Guild Hall & Bench Roster
				</p>
			</div>

			{/* Dual Panel Split Layout */}
			<div className='flex w-full max-w-5xl flex-1 space-x-6 py-2'>
				{/* Custom PCs Panel */}
				<RosterListPanel
					title='Custom Guild Members'
					characters={customCharacters}
					activePartyIds={activePartyIds}
					selectedIndex={customIndex}
					isFocused={activePanel === 'custom'}
					onSelectIndex={(idx) => {
						setActivePanel('custom')
						setCustomIndex(idx)
					}}
				/>

				{/* Recruitable NPCs Panel (Empty state) */}
				<RosterListPanel
					title='Recruitable Mercenaries (NPCs)'
					characters={recruitableNPCs}
					activePartyIds={activePartyIds}
					selectedIndex={npcIndex}
					isFocused={activePanel === 'npc'}
					onSelectIndex={(idx) => {
						setActivePanel('npc')
						setNpcIndex(idx)
					}}
				/>
			</div>

			{/* Navigation Footer */}
			<div className='w-full max-w-5xl rounded border border-slate-800 bg-slate-900/60 p-3 text-center text-xs text-slate-400'>
				<div className='flex justify-around text-[11px] text-slate-400'>
					<span>[◄ / ►] Switch Columns</span>
					<span>[▲ / ▼] Navigate List</span>
					<span>[SPACE] Toggle Party</span>
					<span>[V / ENTER] View Sheet</span>
					<span>[ESC] Main Menu</span>
				</div>
			</div>
		</div>
	)
}
