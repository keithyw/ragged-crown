import { useEffect } from 'react'
import { getGameEngine, inputManager } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

const DIRECTIONS: Record<string, [number, number]> = {
	ArrowUp: [0, -1],
	w: [0, -1],
	ArrowDown: [0, 1],
	s: [0, 1],
	ArrowLeft: [-1, 0],
	a: [-1, 0],
	ArrowRight: [1, 0],
	d: [1, 0],
	// The player's own cell. Items are walked onto, so this is a fallback.
	' ': [0, 0],
}

// The get command's prompts ([Game ?]): a direction, then which party member
// takes the item. Escape cancels at any step.
export const GetPrompt = () => {
	const prompt = useGameStore((state) => state.getPrompt)
	const partySize = useGameStore((state) => state.party.length)
	const setPrompt = useGameStore((state) => state.setGetPrompt)

	useEffect(() => {
		// The latest handler runs first, so the map's movement keys don't fire.
		const unbind = inputManager.registerHandler((key) => {
			if (!prompt) return false
			if (key === 'Escape') {
				setPrompt(null)
			} else if (prompt.step === 'direction') {
				const d = DIRECTIONS[key]
				if (d) getGameEngine().getToward(d[0], d[1])
			} else if (/^[1-9]$/.test(key) && Number(key) <= partySize) {
				getGameEngine().getWith(prompt.pos, Number(key))
			}
			return true
		})
		return () => unbind()
	}, [prompt, partySize, setPrompt])

	if (!prompt) return null

	return (
		<div className='fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded border border-amber-500 bg-slate-900 px-4 py-2 font-mono text-xs text-amber-300 shadow-2xl'>
			{prompt.step === 'direction'
				? 'Get - which direction? [Arrows / WASD] • [SPACE] Here • [ESC] Cancel'
				: `Who takes it? (1-${partySize}) • [ESC] Cancel`}
		</div>
	)
}
