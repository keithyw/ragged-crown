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
	// The player's own cell, for picking the thing. Not a way to push.
	' ': [0, 0],
}

// The move command's prompts ([Game 31]): which thing, then which way to push
// it. Escape cancels at either step.
export const MovePrompt = () => {
	const prompt = useGameStore((state) => state.movePrompt)
	const setPrompt = useGameStore((state) => state.setMovePrompt)

	useEffect(() => {
		// The latest handler runs first, so the map's movement keys don't fire.
		const unbind = inputManager.registerHandler((key) => {
			if (!prompt) return false
			if (key === 'Escape') {
				setPrompt(null)
				return true
			}
			const d = DIRECTIONS[key]
			if (!d) return true
			if (prompt.step === 'direction') {
				getGameEngine().moveToward(d[0], d[1])
			} else if (d[0] !== 0 || d[1] !== 0) {
				getGameEngine().pushThing(prompt.pos, d[0], d[1])
			}
			return true
		})
		return () => unbind()
	}, [prompt, setPrompt])

	if (!prompt) return null

	return (
		<div className='fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded border border-amber-500 bg-slate-900 px-4 py-2 font-mono text-xs text-amber-300 shadow-2xl'>
			{prompt.step === 'direction'
				? 'Move - which direction? [Arrows / WASD] • [SPACE] Here • [ESC] Cancel'
				: 'Push which way? [Arrows / WASD] • [ESC] Cancel'}
		</div>
	)
}
