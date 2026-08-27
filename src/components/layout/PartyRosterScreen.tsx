import { useEffect } from 'react'
import { inputManager } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

export const PartyRosterScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			if (key === 'Escape') {
				setScreen('MAIN_MENU')
				return true
			}
			return false
		})

		return () => unbind()
	}, [setScreen])

	return (
		<div className='flex min-h-screen flex-col items-center justify-center border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
			<div className='mb-6 text-center'>
				<h1 className='text-3xl font-extrabold tracking-wider text-amber-500'>
					PARTY ROSTER MANAGEMENT
				</h1>
				<p className='mt-1 text-xs text-slate-500 uppercase'>
					The Guild Hall & Inn
				</p>
			</div>

			<div className='w-full max-w-2xl rounded border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-400'>
				<p className='text-sm'>Roster management UI stub.</p>
				<p className='mt-2 text-xs text-slate-500'>[ESC] Return to Main Menu</p>
			</div>
		</div>
	)
}
