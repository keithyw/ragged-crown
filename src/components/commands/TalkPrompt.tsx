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
	// The player's own cell: a fallback, as for get.
	' ': [0, 0],
}

// The talk command's prompt ([Game 25]): a direction. No character is chosen.
// Escape cancels.
export const TalkPrompt = () => {
	const prompt = useGameStore((state) => state.talkPrompt)
	const setPrompt = useGameStore((state) => state.setTalkPrompt)

	useEffect(() => {
		// The latest handler runs first, so the map's movement keys don't fire.
		const unbind = inputManager.registerHandler((key) => {
			if (!prompt) return false
			if (key === 'Escape') {
				setPrompt(null)
			} else {
				const d = DIRECTIONS[key]
				if (d) getGameEngine().talkToward(d[0], d[1])
			}
			return true
		})
		return () => unbind()
	}, [prompt, setPrompt])

	if (!prompt) return null

	return (
		<div className='fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded border border-amber-500 bg-slate-900 px-4 py-2 font-mono text-xs text-amber-300 shadow-2xl'>
			Talk - which direction? [Arrows / WASD] • [SPACE] Here • [ESC] Cancel
		</div>
	)
}
