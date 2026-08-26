// src/components/screens/SplashScreen.tsx
import { useEffect } from 'react'
import { inputManager } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

export const SplashScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			if (key === 'Enter' || key === ' ') {
				setScreen('MAIN_MENU')
				return true
			}
			return false
		})

		return () => unbind()
	}, [setScreen])

	return (
		<div
			className='flex min-h-screen flex-col items-center justify-between border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'
			onClick={() => setScreen('MAIN_MENU')}
		>
			{/* Top Header Placeholder */}
			<div className='pt-12 text-center'>
				<p className='text-xs tracking-widest text-amber-600 uppercase'>
					An Retro CRPG Adventure
				</p>
			</div>

			{/* Center Title & Placeholder Graphic Box */}
			<div className='flex flex-col items-center space-y-6'>
				<div className='flex h-64 w-80 items-center justify-center rounded border-2 border-dashed border-slate-700 bg-slate-900/50 p-4 shadow-2xl'>
					<span className='text-center text-sm text-slate-500'>
						[ Placeholder Cover Artwork / Banner Image ]
					</span>
				</div>

				<h1 className='text-4xl font-extrabold tracking-wider text-amber-500 drop-shadow-md md:text-5xl'>
					REALM OF IGNORANCE
				</h1>
			</div>

			{/* Animated Action Prompt */}
			<div className='pb-12 text-center'>
				<div className='animate-pulse text-sm font-bold tracking-widest text-slate-300'>
					[ PRESS ENTER TO START ]
				</div>
				<p className='mt-2 text-[11px] text-slate-600'>
					Click anywhere or press Space / Enter
				</p>
			</div>
		</div>
	)
}
