import { useCallback, useEffect, useState } from 'react'
import { InventoryPanel } from '@/components/inventory/InventoryPanel'
import { inputManager, getCharacterEngine, getGameEngine } from '@/engine'
import { useCharacterCreationStore } from '@/store/useCharacterCreationStore'
import { useContentStore } from '@/store/useContentStore'
import { useGameStore } from '@/store/useGameStore'
import { carryLimit, encumbrance } from '@/utils'

// Trading ([Inventory 21]): first the receiver (a party number), then the item.
type TradeState =
	| null
	| { step: 'recipient'; uid?: string } // uid: chosen already, from the preview
	| { step: 'item'; toNumber: number; toName: string }

// Dropping ([Inventory 22]): pick an item, then confirm.
type DropState = null | { step: 'item' } | { step: 'confirm'; uid: string }

// Equipping and unequipping: pick an entry (the preview's buttons skip this).
type EquipState = null | { mode: 'equip' | 'unequip' }

export const CharacterSheetScreen = () => {
	const setScreen = useGameStore((state) => state.setScreen)
	const inspectedId = useGameStore((state) => state.inspectedCharacterId)
	const context = useGameStore((state) => state.inspectedContext)

	const createdCharacters = useCharacterCreationStore(
		(state) => state.createdCharacters,
	)

	const party = useGameStore((state) => state.party)

	// The guild shows the pool of created characters; in the game the sheet
	// shows the live party, which is the saved game's copy.
	const character = (context === 'WORLD' ? party : createdCharacters).find(
		(c) => c.id === inspectedId,
	)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
	const [trade, setTrade] = useState<TradeState>(null)
	const [itemCursor, setItemCursor] = useState(0)
	const [notice, setNotice] = useState('')
	const [toast, setToast] = useState('')

	// Confirms a move after the fact. It reuses the line the engine just wrote
	// to the event log, so the two can't disagree.
	const showToast = () =>
		setToast(useGameStore.getState().logs[0]?.replace(/^> /, '') ?? '')

	useEffect(() => {
		if (!toast) return
		const timer = setTimeout(() => setToast(''), 3000)
		return () => clearTimeout(timer)
	}, [toast])

	const endTrade = () => {
		setTrade(null)
		setNotice('')
	}

	const [drop, setDrop] = useState<DropState>(null)
	const [equipMode, setEquipMode] = useState<EquipState>(null)
	const items = useContentStore((state) => state.items)

	// The quest-item check comes before the confirmation.
	// Shared by the D key and the preview's Drop button.
	const startDrop = useCallback(
		(uid: string) => {
			if (!character) return
			const check = getGameEngine().canDrop(character.id, uid)
			if (check === 'quest_item') setNotice("A quest item can't be dropped.")
			else if (check === 'ok') {
				setDrop({ step: 'confirm', uid })
				setNotice('')
			}
		},
		[character],
	)

	// Shared by the E and U keys and the preview's buttons. Equipping runs the
	// engine's checks and says why when one fails; unequipping has none.
	const doEquip = useCallback(
		(uid: string | undefined) => {
			if (!character || !uid) return
			const problem = getGameEngine().equipItem(character.id, uid)
			if (problem) {
				setNotice(problem)
				return
			}
			showToast()
			setEquipMode(null)
			setNotice('')
		},
		[character],
	)

	const doUnequip = useCallback(
		(uid: string | undefined) => {
			if (!character || !uid) return
			if (getGameEngine().unequipItem(character.id, uid)) showToast()
			setEquipMode(null)
			setNotice('')
		},
		[character],
	)

	const pickDropItem = useCallback(
		(uid: string | undefined) => {
			if (drop?.step === 'item' && uid) startDrop(uid)
		},
		[drop, startDrop],
	)

	// The preview's Trade button: the item is chosen, so only the receiver is
	// left to pick.
	const startTrade = useCallback((uid: string) => {
		if (useGameStore.getState().party.length < 2) {
			setNotice('There is no one to trade with.')
		} else {
			setTrade({ step: 'recipient', uid })
			setNotice('')
		}
	}, [])

	const confirmDrop = useCallback(
		(uid: string) => {
			if (
				character &&
				getGameEngine().dropItem(character.id, uid) === 'dropped'
			)
				showToast()
			setDrop(null)
			setNotice('')
		},
		[character],
	)

	const pickTradeItem = useCallback(
		(uid: string | undefined) => {
			if (trade?.step !== 'item' || !character || !uid) return
			const result = getGameEngine().tradeItem(
				character.id,
				uid,
				trade.toNumber,
			)
			if (result === 'too_heavy') setNotice('Too heavy!')
			else {
				if (result === 'traded') showToast()
				setTrade(null)
				setNotice('')
			}
		},
		[trade, character],
	)

	const handleBack = useCallback(() => {
		if (context === 'GUILD') {
			// this might be wrong because of key bindings
			getGameEngine().enterPartyRosterMode()
		} else {
			if (context === 'WORLD') getGameEngine().enterWorldMode()
			else setScreen('MAIN_MENU') // Fallback return route
		}
	}, [context, setScreen])

	const handleDelete = useCallback(() => {
		if (character) {
			getCharacterEngine().removeCharacter(character)
			handleBack()
		}
	}, [character, handleBack])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()

			if (showDeleteConfirm) {
				if (k === 'y') {
					handleDelete()
					return true
				}
				if (k === 'n' || key === 'Escape') {
					setShowDeleteConfirm(false)
					return true
				}
				return false
			}

			if (trade) {
				const sorted = [...useGameStore.getState().party].sort(
					(a, b) => a.order - b.order,
				)
				if (key === 'Escape') {
					endTrade()
				} else if (trade.step === 'recipient') {
					const to = /^[1-9]$/.test(key) ? sorted[Number(key) - 1] : undefined
					if (to?.id === character?.id) {
						setNotice('Choose another character.')
					} else if (to && trade.uid && character) {
						// Chosen from the preview: trade straight away.
						const result = getGameEngine().tradeItem(
							character.id,
							trade.uid,
							Number(key),
						)
						if (result === 'too_heavy') setNotice('Too heavy!')
						else {
							if (result === 'traded') showToast()
							endTrade()
						}
					} else if (to) {
						setTrade({ step: 'item', toNumber: Number(key), toName: to.name })
						setItemCursor(0)
						setNotice('')
					}
				} else {
					const entries = character?.inventory ?? []
					if (key === 'ArrowLeft' || key === 'ArrowUp') {
						setItemCursor((c) => Math.max(0, c - 1))
					} else if (key === 'ArrowRight' || key === 'ArrowDown') {
						setItemCursor((c) => Math.min(entries.length - 1, c + 1))
					} else if (key === 'Enter') {
						pickTradeItem(entries[itemCursor]?.uid)
					}
				}
				return true
			}

			if (equipMode) {
				const entries = character?.inventory ?? []
				if (key === 'Escape') {
					setEquipMode(null)
					setNotice('')
				} else if (key === 'ArrowLeft' || key === 'ArrowUp') {
					setItemCursor((c) => Math.max(0, c - 1))
				} else if (key === 'ArrowRight' || key === 'ArrowDown') {
					setItemCursor((c) => Math.min(entries.length - 1, c + 1))
				} else if (key === 'Enter') {
					const uid = entries[itemCursor]?.uid
					if (equipMode.mode === 'equip') doEquip(uid)
					else doUnequip(uid)
				}
				return true
			}

			if (drop) {
				const entries = character?.inventory ?? []
				if (key === 'Escape') {
					setDrop(null)
					setNotice('')
				} else if (drop.step === 'confirm') {
					if (k === 'y' || key === 'Enter') confirmDrop(drop.uid)
					else if (k === 'n') setDrop(null)
				} else if (key === 'ArrowLeft' || key === 'ArrowUp') {
					setItemCursor((c) => Math.max(0, c - 1))
				} else if (key === 'ArrowRight' || key === 'ArrowDown') {
					setItemCursor((c) => Math.min(entries.length - 1, c + 1))
				} else if (key === 'Enter') {
					pickDropItem(entries[itemCursor]?.uid)
				}
				return true
			}

			if (key === 'Escape') {
				handleBack()
				return true
			}

			if (context === 'GUILD' && (key === 'Delete' || k === 'x')) {
				setShowDeleteConfirm(true)
				return true
			}

			if (context === 'WORLD') {
				// X or M leaves for the map (X is delete in the guild, so only here).
				if (k === 'x' || k === 'm') {
					handleBack()
					return true
				}
				if (k === 'd') {
					if ((character?.inventory ?? []).length === 0) {
						setNotice('There is nothing to drop.')
					} else {
						setDrop({ step: 'item' })
						setItemCursor(0)
						setNotice('')
					}
					return true
				}
				if (k === 't') {
					if (useGameStore.getState().party.length < 2) {
						setNotice('There is no one to trade with.')
					} else {
						setTrade({ step: 'recipient' })
						setNotice('')
					}
					return true
				}
				// 1-4: the party member in that position. Alternative for larger
				// parties is a separate card ([Game 15]).
				if (/^[1-4]$/.test(key)) {
					const member = [...useGameStore.getState().party].sort(
						(a, b) => a.order - b.order,
					)[Number(key) - 1]
					if (member) {
						useGameStore.getState().setInspectedCharacter(member.id, 'WORLD')
					}
					return true
				}
			}

			return false
		})

		return () => unbind()
	}, [
		handleBack,
		handleDelete,
		character,
		context,
		showDeleteConfirm,
		trade,
		drop,
		equipMode,
		doEquip,
		doUnequip,
		itemCursor,
		pickTradeItem,
		pickDropItem,
		confirmDrop,
	])

	if (!character) {
		return (
			<div className='flex min-h-screen flex-col items-center justify-center border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
				<p className='text-sm text-slate-400'>Character record not found.</p>
				<button
					type='button'
					onClick={handleBack}
					className='mt-4 rounded border border-amber-500 bg-amber-950/40 px-4 py-2 text-xs font-bold text-amber-300'
				>
					Return
				</button>
			</div>
		)
	}

	// What the Commands panel shows for the current mode.
	const modeLabel =
		trade?.step === 'recipient'
			? 'Trade: choose who receives it'
			: trade?.step === 'item'
				? `Trade to ${trade.toName}: choose an item`
				: drop?.step === 'item'
					? 'Drop: choose an item'
					: ''
	const commands: [string, string][] =
		trade?.step === 'recipient'
			? [
					['1-9', 'Choose character'],
					['ESC', 'Cancel'],
				]
			: trade?.step === 'item' || drop?.step === 'item'
				? [
						['←/→', 'Select'],
						['ENTER', trade ? 'Give' : 'Drop'],
						['ESC', 'Cancel'],
					]
				: context === 'WORLD'
					? [
							['1-4', 'Character'],
							['T', 'Trade'],
							['D', 'Drop'],
							['X / M / ESC', 'Return to Map'],
						]
					: [['ESC', 'Return to Roster']]

	return (
		<div className='flex min-h-screen flex-col justify-between border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
			{/* Top Bar / Navigation Header */}
			<div className='flex items-center justify-between border-b border-slate-800 pb-4'>
				<div>
					<h1 className='text-3xl font-extrabold tracking-wider text-amber-500'>
						{character.name}
					</h1>
					<p className='mt-1 text-xs text-slate-500 uppercase'>
						Level {character.level} • {character.gender} • {character.race}
					</p>
				</div>
				<button
					type='button'
					onClick={handleBack}
					className='rounded border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-500'
				>
					[ ESC ] Back
				</button>
			</div>

			{/* Primary Content Grid */}
			<div className='my-6 grid flex-1 grid-cols-12 gap-6'>
				{/* Left Column: Vitals & Base Stats */}
				<div className='col-span-4 space-y-4 rounded border border-slate-800 bg-slate-900/40 p-5'>
					<h3 className='border-b border-slate-800 pb-2 text-xs font-bold tracking-widest text-amber-500 uppercase'>
						Vitals & Attributes
					</h3>

					<div className='space-y-2 text-xs'>
						<div className='flex justify-between border-b border-slate-800/60 pb-1'>
							<span className='text-slate-500'>HEALTH:</span>
							<span className='font-bold text-emerald-400'>
								{character.hp.current} / {character.hp.max}
							</span>
						</div>
						<div className='flex justify-between border-b border-slate-800/60 pb-1'>
							<span className='text-slate-500'>SPELL POINTS:</span>
							<span className='font-bold text-sky-400'>
								{character.sp.current} / {character.sp.max}
							</span>
						</div>
					</div>

					<div className='space-y-1.5 pt-2 text-xs'>
						{Object.entries(character.attributes).map(([stat, val]) => (
							<div
								key={stat}
								className='flex justify-between rounded border border-slate-800 bg-slate-950/60 p-2'
							>
								<span className='text-slate-400 uppercase'>{stat}:</span>
								<span className='font-bold text-amber-400'>{val}</span>
							</div>
						))}
					</div>
				</div>

				{/* Right Column: Inventory (equipment & spells come later) */}
				<div className='col-span-8 flex flex-col gap-1'>
					<InventoryPanel
						entries={character.inventory ?? []}
						weight={{
							carried: encumbrance(character, items),
							limit: carryLimit(character),
						}}
						onTrade={context === 'WORLD' ? (e) => startTrade(e.uid) : undefined}
						onDrop={context === 'WORLD' ? (e) => startDrop(e.uid) : undefined}
						equipment={character.equipment}
						onEquip={context === 'WORLD' ? (e) => doEquip(e.uid) : undefined}
						onUnequip={
							context === 'WORLD' ? (e) => doUnequip(e.uid) : undefined
						}
						selecting={
							trade?.step === 'item'
								? {
										cursor: itemCursor,
										onPick: (entry) => pickTradeItem(entry.uid),
									}
								: drop?.step === 'item'
									? {
											cursor: itemCursor,
											onPick: (entry) => pickDropItem(entry.uid),
										}
									: equipMode
										? {
												cursor: itemCursor,
												onPick: (entry) =>
													equipMode.mode === 'equip'
														? doEquip(entry.uid)
														: doUnequip(entry.uid),
											}
										: undefined
						}
					/>
					{/* Messages: reserved height so the layout doesn't jump */}
					<div className='h-5 text-center text-sm leading-5 font-bold'>
						{notice ? (
							<span className='text-rose-400'>{notice}</span>
						) : (
							toast && <span className='text-emerald-400'>{toast}</span>
						)}
					</div>

					{/* Commands: what the keys do right now */}
					<div className='rounded border border-slate-800 bg-slate-900/40 p-4'>
						<h3 className='border-b border-slate-800 pb-2 text-xs font-bold tracking-widest text-amber-500 uppercase'>
							Commands
							{modeLabel && (
								<span className='ml-3 text-sky-400 normal-case'>
									{modeLabel}
								</span>
							)}
						</h3>
						<div className='flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 text-sm'>
							{commands.map(([key, label]) => (
								<span key={key} className='text-slate-300'>
									<span className='mr-1.5 font-bold text-amber-400'>
										[{key}]
									</span>
									{label}
								</span>
							))}
							{context === 'GUILD' && (
								<button
									type='button'
									onClick={() => setShowDeleteConfirm(true)}
									className='ml-auto rounded border border-rose-900 bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900 hover:text-slate-100'
								>
									[ DEL / X ] Delete Character
								</button>
							)}
						</div>
					</div>
				</div>
			</div>

			{drop?.step === 'confirm' && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 font-mono'>
					<div className='w-full max-w-md space-y-4 rounded border border-amber-500 bg-slate-900 p-6 text-center shadow-2xl'>
						<h4 className='text-sm font-bold tracking-wider text-amber-500 uppercase'>
							Drop this item?
						</h4>
						<p className='text-xs text-slate-300'>
							{items.get(
								character.inventory?.find((e) => e.uid === drop.uid)?.itemId ??
									'',
							)?.name ?? 'This item'}{' '}
							will be removed from the game.
						</p>
						<p className='text-xs text-slate-500'>
							[ Y / ENTER ] Drop • [ N / ESC ] Cancel
						</p>
					</div>
				</div>
			)}

			{/* Confirmation Dialog Overlay */}
			{showDeleteConfirm && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 font-mono'>
					<div className='w-full max-w-md space-y-4 rounded border border-rose-500 bg-slate-900 p-6 text-center shadow-2xl'>
						<h4 className='text-sm font-bold tracking-wider text-rose-500 uppercase'>
							PERMANENTLY DELETE CHARACTER?
						</h4>
						<p className='text-xs text-slate-300'>
							Are you sure you want to delete{' '}
							<span className='font-bold text-amber-400'>{character.name}</span>
							? This cannot be undone.
						</p>
						<div className='flex justify-center space-x-4 pt-2'>
							<button
								type='button'
								onClick={handleDelete}
								className='rounded border border-rose-500 bg-rose-950 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-600 hover:text-slate-950'
							>
								[ Y ] Yes, Delete
							</button>
							<button
								type='button'
								onClick={() => setShowDeleteConfirm(false)}
								className='rounded border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:border-slate-500'
							>
								[ N / ESC ] Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
