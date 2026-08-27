import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	STARTING_POOL,
	DEFAULT_STAT,
	DEFAULT_ATTRIBUTES,
	MIN_STAT,
	MAX_STAT,
	STR_DESC,
	DEX_DESC,
	INT_DESC,
	WIS_DESC,
	PER_DESC,
	SPD_DESC,
	CON_DESC,
} from '@/constants'
import { inputManager } from '@/engine'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import type { Attributes } from '@/types'

interface CharacterAttributesStepProps {
	onCancel: () => void
}

const ATTRIBUTE_KEYS: (keyof Attributes)[] = [
	'strength',
	'dexterity',
	'intelligence',
	'wisdom',
	'personality',
	'speed',
	'constitution',
]

const ATTRIBUTE_DESCRIPTIONS: Record<keyof Attributes, string> = {
	strength: STR_DESC,
	dexterity: DEX_DESC,
	intelligence: INT_DESC,
	wisdom: WIS_DESC,
	personality: PER_DESC,
	speed: SPD_DESC,
	constitution: CON_DESC,
}

export const CharacterAttributesStep = ({
	onCancel,
}: CharacterAttributesStepProps) => {
	const storeAttributes = useCharacterCreationStore(
		(state) => state.draft.attributes,
	)
	const updateDraft = useCharacterCreationStore((state) => state.updateDraft)
	const nextStep = useCharacterCreationStore((state) => state.nextStep)
	const prevStep = useCharacterCreationStore((state) => state.prevStep)

	const draftAttributes = useMemo(
		() => storeAttributes || DEFAULT_ATTRIBUTES,
		[storeAttributes],
	)

	const [selectedIndex, setSelectedIndex] = useState(0)
	const [error, setError] = useState<string | null>(null)

	// Calculate points spent relative to base 10 across all stats
	const pointsSpent = Object.values(draftAttributes).reduce(
		(acc, val) => acc + (val - DEFAULT_STAT),
		0,
	)
	const remainingPoints = STARTING_POOL - pointsSpent

	const activeKey = ATTRIBUTE_KEYS[selectedIndex]

	const handleModifyStat = useCallback(
		(delta: number) => {
			const currentValue = draftAttributes[activeKey]
			const newValue = currentValue + delta

			if (delta > 0) {
				if (remainingPoints <= 0) {
					setError('No remaining attribute points available.')
					return
				}
				if (newValue > MAX_STAT) {
					setError(`Attribute cannot exceed maximum of ${MAX_STAT}.`)
					return
				}
			} else if (delta < 0) {
				if (newValue < MIN_STAT) {
					setError(`Attribute cannot fall below minimum of ${MIN_STAT}.`)
					return
				}
			}

			setError(null)
			updateDraft({
				attributes: {
					...draftAttributes,
					[activeKey]: newValue,
				},
			})
		},
		[activeKey, draftAttributes, remainingPoints, updateDraft],
	)

	const handleContinue = useCallback(() => {
		if (remainingPoints > 0) {
			setError(`You still have ${remainingPoints} unassigned point(s).`)
			return
		}
		setError(null)
		nextStep()
	}, [nextStep, remainingPoints])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			// Vertical Navigation
			if (key === 'ArrowUp' || k === 'w') {
				setSelectedIndex((prev) =>
					prev > 0 ? prev - 1 : ATTRIBUTE_KEYS.length - 1,
				)
				return true
			}
			if (key === 'ArrowDown' || k === 's') {
				setSelectedIndex((prev) =>
					prev < ATTRIBUTE_KEYS.length - 1 ? prev + 1 : 0,
				)
				return true
			}

			// Value Modification
			if (key === 'ArrowRight' || k === 'd' || key === '+') {
				handleModifyStat(1)
				return true
			}
			if (key === 'ArrowLeft' || k === 'a' || key === '-') {
				handleModifyStat(-1)
				return true
			}

			// Advance
			if (key === 'Enter') {
				handleContinue()
				return true
			}

			return false
		})

		return () => unbind()
	}, [
		draftAttributes,
		handleContinue,
		handleModifyStat,
		selectedIndex,
		remainingPoints,
	])

	return (
		<div className='w-full max-w-md space-y-4 font-mono'>
			{/* Pool Counter Header */}
			<div className='flex items-center justify-between rounded border border-slate-700 bg-slate-900 p-3'>
				<span className='text-xs font-bold text-slate-400 uppercase'>
					POINTS REMAINING:
				</span>
				<span
					className={`text-base font-extrabold ${
						remainingPoints > 0 ? 'text-amber-400' : 'text-slate-500'
					}`}
				>
					{remainingPoints}
				</span>
			</div>

			{/* Error Banner */}
			{error && (
				<div className='rounded border border-rose-500/40 bg-rose-950/40 p-2 text-center text-xs font-semibold text-rose-400'>
					{error}
				</div>
			)}

			{/* Interactive Attribute List */}
			<div className='space-y-1.5'>
				{ATTRIBUTE_KEYS.map((key, idx) => {
					const isSelected = idx === selectedIndex
					const value = draftAttributes[key]

					return (
						<div
							key={key}
							onClick={() => setSelectedIndex(idx)}
							className={`flex cursor-pointer items-center justify-between rounded border p-2 text-xs transition-all ${
								isSelected
									? 'border-amber-400 bg-amber-950/20 text-slate-100 shadow-sm'
									: 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
							}`}
						>
							<div className='flex items-center space-x-2'>
								<span className='w-3 text-amber-500'>
									{isSelected ? '►' : ' '}
								</span>
								<span className='font-bold tracking-wider uppercase'>
									{key}
								</span>
							</div>

							<div className='flex items-center space-x-3'>
								<button
									type='button'
									onClick={(e) => {
										e.stopPropagation()
										setSelectedIndex(idx)
										handleModifyStat(-1)
									}}
									className='px-1.5 font-bold text-slate-500 hover:text-amber-400'
								>
									[-]
								</button>
								<span className='w-6 text-center font-bold text-amber-300'>
									{value}
								</span>
								<button
									type='button'
									onClick={(e) => {
										e.stopPropagation()
										setSelectedIndex(idx)
										handleModifyStat(1)
									}}
									className='px-1.5 font-bold text-slate-500 hover:text-amber-400'
								>
									[+]
								</button>
							</div>
						</div>
					)
				})}
			</div>

			{/* Description Footer */}
			<div className='h-12 rounded border border-slate-800 bg-slate-900/40 p-2 text-[11px] leading-relaxed text-slate-400'>
				<span className='font-bold text-slate-300 uppercase'>
					{activeKey}:{' '}
				</span>
				{ATTRIBUTE_DESCRIPTIONS[activeKey]}
			</div>

			{/* Actions */}
			<div className='flex justify-between space-x-3 pt-1'>
				<button
					type='button'
					onClick={prevStep}
					className='w-1/3 rounded border border-slate-700 bg-slate-900 p-2 text-xs font-bold text-slate-400 hover:border-slate-500 hover:text-slate-200'
				>
					&lt; Back
				</button>
				<button
					type='button'
					onClick={onCancel}
					className='w-1/3 rounded border border-rose-950/60 bg-rose-950/20 p-2 text-xs font-bold text-rose-400 hover:border-rose-800 hover:bg-rose-950/40'
				>
					Cancel
				</button>
				<button
					type='button'
					onClick={handleContinue}
					className='w-1/3 rounded border border-amber-500 bg-amber-950/50 p-2 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-slate-950'
				>
					Next [ ENTER ]
				</button>
			</div>

			<div className='text-center text-[10px] text-slate-500'>
				[▲/▼] Navigate • [◄/►] Adjust Value • [ENTER] Continue
			</div>
		</div>
	)
}
