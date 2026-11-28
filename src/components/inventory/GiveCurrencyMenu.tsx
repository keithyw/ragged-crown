import { useEffect, useState } from 'react'
import type { Currency } from '@shared/types'
import { inputManager } from '@/engine'
import type { PlayerCharacter } from '@/types'
import { cn, heldCurrencies } from '@/utils'

interface GiveCurrencyMenuProps {
	from: PlayerCharacter
	toName: string
	onGive: (currency: Currency, amount: number) => void
	onBack: () => void
}

// The last two steps of giving currency ([Currency 11]): up/down picks one the
// giver holds and Enter takes it, then the amount is typed. Escape goes back
// one step.
export const GiveCurrencyMenu = ({
	from,
	toName,
	onGive,
	onBack,
}: GiveCurrencyMenuProps) => {
	const [cursor, setCursor] = useState(0)
	const [chosen, setChosen] = useState<Currency | null>(null)
	const [amount, setAmount] = useState('')
	const [message, setMessage] = useState('')

	const held = heldCurrencies(from)
	const max = chosen ? (from.currency?.[chosen] ?? 0) : 0

	useEffect(() => {
		// The character sheet lets every key through while this is open.
		const unbind = inputManager.registerHandler((key) => {
			if (!chosen) {
				if (key === 'Escape') onBack()
				else if (key === 'ArrowUp') setCursor((c) => Math.max(0, c - 1))
				else if (key === 'ArrowDown') {
					setCursor((c) => Math.min(held.length - 1, c + 1))
				} else if (key === 'Enter' && held[cursor]) {
					setChosen(held[cursor])
					setAmount('')
				}
				return true
			}

			if (key === 'Escape') {
				setChosen(null)
				setMessage('')
			} else if (/^[0-9]$/.test(key)) {
				setAmount((a) => (a + key).replace(/^0+/, ''))
				setMessage('')
			} else if (key === 'Backspace') {
				setAmount((a) => a.slice(0, -1))
				setMessage('')
			} else if (key === 'Enter') {
				const n = Number(amount)
				if (n >= 1 && n <= max) onGive(chosen, n)
				else setMessage(`Enter 1-${max}.`)
			}
			return true
		})
		return () => unbind()
	}, [chosen, cursor, held, amount, max, onGive, onBack])

	return (
		<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 font-mono'>
			<div className='w-full max-w-xs space-y-3 rounded border border-amber-500 bg-slate-900 p-5 shadow-2xl'>
				<h4 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					Give to {toName}
				</h4>

				{chosen ? (
					<div className='space-y-2 text-sm'>
						<p className='text-slate-300'>
							How much <span className='uppercase'>{chosen}</span>? (1-{max})
						</p>
						<p className='rounded border border-slate-700 bg-slate-950 px-2 py-1 font-bold text-amber-300'>
							{amount}
							<span className='animate-pulse'>_</span>
						</p>
					</div>
				) : (
					<ul className='space-y-1 text-sm'>
						{held.map((c, i) => (
							<li
								key={c}
								className={cn(
									'flex justify-between rounded px-2 py-1 uppercase',
									i === cursor
										? 'bg-amber-950/60 text-amber-300'
										: 'text-slate-300',
								)}
							>
								<span>{c}</span>
								<span>{from.currency?.[c]}</span>
							</li>
						))}
					</ul>
				)}

				<p className='h-4 text-xs font-bold text-rose-400'>{message}</p>
				<p className='text-xs text-slate-600'>
					{chosen
						? '[0-9] Type • [ENTER] Give • [ESC] Back'
						: '[↑/↓] Select • [ENTER] Choose • [ESC] Back'}
				</p>
			</div>
		</div>
	)
}
