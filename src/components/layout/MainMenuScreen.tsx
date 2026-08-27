import { useCallback, useEffect, useState, useMemo } from 'react'
import { inputManager, getGameEngine } from '@/engine'
import { useGameStore } from '@/store/useGameStore'
import type { GameScreen } from '@/types'

interface MenuOption {
	id: number
	label: string
	screen?: GameScreen
	action?: () => void
	requiresParty: boolean
}

export const MainMenuScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)
	const party = useGameStore((state) => state.party)
	const addLog = useGameStore((state) => state.addLog)

	const [selectedIndex, setSelectedIndex] = useState(0)
	const [notice, setNotice] = useState<string | null>(null)

	const hasPartyMembers = party.length > 0

	const menuOptions = useMemo<MenuOption[]>(
		() => [
			{
				id: 1,
				label: 'Create Character',
				screen: 'CHARACTER_CREATION',
				requiresParty: false,
				action: () => {
					getGameEngine().enterCharacterCreationMode()
				},
			},
			{
				id: 2,
				label: 'Party Roster & Formation',
				screen: 'PARTY_ROSTER',
				requiresParty: false,
				action: () => {
					getGameEngine().enterPartyRosterMode()
				},
			},
			{
				id: 3,
				label: 'View Active Party',
				action: () => {
					if (!hasPartyMembers) {
						setNotice('No active party members to view.')
					} else {
						setNotice(`Active Party: ${party.map((p) => p.name).join(', ')}`)
					}
				},
				requiresParty: false,
			},
			{
				id: 4,
				label: 'Settings & Options',
				action: () => {
					setNotice('Settings coming soon!')
				},
				requiresParty: false,
			},
			{
				id: 5,
				label: 'Enter the World',
				action: () => {
					if (hasPartyMembers) {
						addLog('> Entering the realm...')
						getGameEngine().enterWorldMode()
					} else {
						setNotice('Add at least 1 character to your party to start!')
					}
				},
				requiresParty: true,
			},
		],
		[addLog, hasPartyMembers, party],
	)

	const handleExecuteOption = useCallback(
		(option: MenuOption) => {
			if (option.requiresParty && !hasPartyMembers) {
				setNotice('Add at least 1 character to your party to start!')
				return
			}

			if (option.screen) {
				setScreen(option.screen)
			} else if (option.action) {
				option.action()
			}
		},
		[hasPartyMembers, setScreen],
	)

	useEffect(() => {
		const unbind = inputManager.registerHandler((key, event) => {
			const k = key.toLowerCase()

			// Arrow Navigation
			if (key === 'ArrowUp' || k === 'w') {
				setSelectedIndex(
					(prev) => (prev - 1 + menuOptions.length) % menuOptions.length,
				)
				return true
			}
			if (key === 'ArrowDown' || k === 's') {
				setSelectedIndex((prev) => (prev + 1) % menuOptions.length)
				return true
			}

			// Direct Number Keys (1-5)
			const num = Number(key)
			if (!isNaN(num) && num >= 1 && num <= menuOptions.length) {
				event.preventDefault()
				const option = menuOptions[num - 1]
				setSelectedIndex(num - 1)
				handleExecuteOption(option)
				return true
			}

			// Enter Selection
			if (key === 'Enter' || key === ' ') {
				const option = menuOptions[selectedIndex]
				handleExecuteOption(option)
				return true
			}

			return false
		})

		return () => unbind()
	}, [
		selectedIndex,
		handleExecuteOption,
		hasPartyMembers,
		menuOptions,
		setScreen,
	])

	return (
		<div className='flex min-h-screen flex-col items-center justify-between border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
			{/* Title Banner */}
			<div className='pt-8 text-center'>
				<h1 className='text-3xl font-extrabold tracking-wider text-amber-500 drop-shadow-md md:text-4xl'>
					REALM OF IGNORANCE
				</h1>
				<p className='mt-1 text-xs tracking-widest text-slate-500 uppercase'>
					Main Menu
				</p>
			</div>

			{/* Main Options Roster */}
			<div className='w-full max-w-md space-y-3'>
				{menuOptions.map((opt, idx) => {
					const isSelected = idx === selectedIndex
					const isDisabled = opt.requiresParty && !hasPartyMembers

					return (
						<button
							key={opt.id}
							type='button'
							onClick={() => {
								setSelectedIndex(idx)
								handleExecuteOption(opt)
							}}
							className={`flex w-full items-center justify-between rounded border p-3 text-left transition-all ${
								isSelected
									? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400/50'
									: 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
							}`}
						>
							<div className='flex items-center space-x-3'>
								<span className='font-bold text-amber-500'>[{opt.id}]</span>
								<span
									className={`font-semibold ${
										isDisabled
											? 'text-slate-600 line-through'
											: isSelected
												? 'text-amber-300'
												: 'text-slate-200'
									}`}
								>
									{opt.label}
								</span>
							</div>

							{isDisabled && (
								<span className='text-[10px] font-bold text-rose-500/80 uppercase'>
									Locked
								</span>
							)}
						</button>
					)
				})}

				{/* Notice Banner */}
				{notice && (
					<div className='mt-4 rounded border border-amber-500/30 bg-amber-950/20 p-2 text-center text-xs text-amber-300'>
						{notice}
					</div>
				)}
			</div>

			{/* Footer Guidance */}
			<div className='pb-6 text-center text-xs text-slate-500'>
				<p>Use [W/S] or [Arrow Keys] to navigate • [ENTER] to select</p>
				<p className='mt-1 text-[11px] text-slate-600'>
					Or press [1-5] for direct selection
				</p>
			</div>
		</div>
	)
}
