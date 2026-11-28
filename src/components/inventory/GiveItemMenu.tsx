import { useEffect, useState } from 'react'
import { getGameEngine, inputManager } from '@/engine'
import { useContentStore } from '@/store/useContentStore'
import { useGameStore } from '@/store/useGameStore'
import { cn, qualifiedName } from '@/utils'

// Hands out the items of a GIVE_ITEM interaction ([Game 17]): up/down picks a
// line, Enter asks who gets it, a party number gives the whole pile, Escape
// skips (or, on the list, leaves and drops what is left on the cell). T asks
// who takes everything ([Inventory 52]).
export const GiveItemMenu = () => {
	const pool = useGameStore((state) => state.givePool)
	const partySize = useGameStore((state) => state.party.length)
	const items = useContentStore((state) => state.items)

	const [cursor, setCursor] = useState(0)
	// What a party number would hand out: the selected line, or all of them.
	const [choosing, setChoosing] = useState<'line' | 'all' | null>(null)
	const [message, setMessage] = useState('')

	const count = pool?.items.length ?? 0

	useEffect(() => {
		// The latest handler runs first, so this one sees every key while the
		// menu is open and the map's movement keys never fire.
		const unbind = inputManager.registerHandler((key) => {
			if (choosing) {
				if (key === 'Escape') {
					setChoosing(null)
					setMessage('')
				} else if (/^[1-9]$/.test(key) && Number(key) <= partySize) {
					if (choosing === 'all') {
						const result = getGameEngine().giveAllFromPool(Number(key))
						if (!result) return true
						const { taken, tooHeavy } = result
						if (taken === 0) {
							// Keeps asking, so someone else can try.
							setMessage('Too heavy!')
						} else {
							setChoosing(null)
							setCursor(0)
							setMessage(
								tooHeavy.length ? `Too heavy: ${tooHeavy.join(', ')}` : '',
							)
						}
						return true
					}
					const result = getGameEngine().giveFromPool(cursor, Number(key))
					if (result === 'too_heavy') {
						setMessage('Too heavy!')
					} else {
						setChoosing(null)
						setMessage('')
						setCursor((c) => Math.max(0, Math.min(c, count - 2)))
					}
				}
				return true
			}

			if (key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1))
			else if (key === 'ArrowDown') setCursor((c) => Math.min(count - 1, c + 1))
			else if (key === 'Enter') {
				setChoosing('line')
				setMessage('')
			} else if (key === 't' || key === 'T') {
				setChoosing('all')
				setMessage('')
			} else if (key === 'Escape') getGameEngine().closeGivePool()
			return true
		})
		return () => unbind()
	}, [choosing, cursor, count, partySize])

	if (!pool) return null

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 font-mono'>
			<div className='w-full max-w-md space-y-3 rounded border border-amber-500 bg-slate-900 p-5 shadow-2xl'>
				<h4 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					Items
				</h4>

				<ul className='max-h-64 space-y-1 overflow-y-auto text-sm'>
					{pool.items.map((line, i) => (
						<li
							key={`${line.itemId}-${i}`}
							className={cn(
								'flex justify-between rounded px-2 py-1',
								i === cursor
									? 'bg-amber-950/60 text-amber-300'
									: 'text-slate-300',
							)}
						>
							<span>
								{qualifiedName(
									items.get(line.itemId)?.name ?? '(unknown)',
									line.qualifiers,
								)}
							</span>
							<span>x{line.quantity}</span>
						</li>
					))}
				</ul>

				<p className='min-h-4 text-xs text-slate-400'>
					{choosing
						? `Give ${choosing === 'all' ? 'everything ' : ''}to (1-${partySize})`
						: ''}
					{message && (
						<span className='ml-2 font-bold text-rose-400'>{message}</span>
					)}
				</p>
				<p className='text-xs text-slate-600'>
					{choosing
						? '[1-9] Choose • [ESC] Skip'
						: '[↑/↓] Select • [ENTER] Give • [T] Take all • [ESC] Leave'}
				</p>
			</div>
		</div>
	)
}
