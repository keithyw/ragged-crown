import { useState } from 'react'
import { SpriteCanvas } from '@/components/map/SpriteCanvas'
import { useContentStore } from '@/store/useContentStore'
import type { Equipment, InventoryEntry } from '@/types'
import { cn } from '@/utils'
import { ItemPreview } from './ItemPreview'

// A character's inventory ([Inventory 9]): one cell per entry with its sprite
// (or glyph symbol) and a quantity badge. Click a cell for its details; the
// grid scrolls.
export const InventoryPanel = ({
	entries,
	weight,
	selecting,
	onTrade,
	onDrop,
	equipment,
	onEquip,
	onUnequip,
}: {
	entries: InventoryEntry[]
	/** What is equipped; an equipped cell gets a mark. */
	equipment?: Equipment
	/** The preview offers Equip or Unequip (weapons and armor only) when given. */
	onEquip?: (entry: InventoryEntry) => void
	onUnequip?: (entry: InventoryEntry) => void
	/** Total carried and the most that can be carried; shown below the grid. */
	weight?: { carried: number; limit: number }
	/** The preview offers Trade and Drop only when these are given. */
	onTrade?: (entry: InventoryEntry) => void
	onDrop?: (entry: InventoryEntry) => void
	/** While set, a click picks an entry instead of opening its preview. */
	selecting?: { cursor: number; onPick: (entry: InventoryEntry) => void }
}) => {
	const items = useContentStore((state) => state.items)
	const sprites = useContentStore((state) => state.sprites)
	const [selectedUid, setSelectedUid] = useState<string | null>(null)
	const selected = entries.find((e) => e.uid === selectedUid)
	const equippedUids = new Set(Object.values(equipment ?? {}))
	// The store types every item as ItemDef; weapons and armor differ by kind.
	const selectedKind: string | undefined =
		selected && items.get(selected.itemId)?.kind
	const canEquip = selectedKind === 'weapon' || selectedKind === 'armor'

	return (
		<div className='flex h-0 min-h-96 flex-1 flex-col rounded border border-slate-800 bg-slate-900/40 p-5'>
			<div className='flex items-center justify-between border-b border-slate-800 pb-2'>
				<h3 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					Inventory
				</h3>
				<span className='text-xs text-slate-500'>{entries.length} items</span>
			</div>

			{/* Scrolls when there are more cells than fit */}
			<div className='mt-4 min-h-0 flex-1 overflow-y-auto'>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2'>
					{entries.map((entry, index) => {
						const def = items.get(entry.itemId)
						const sprite = sprites.get(def?.spriteId ?? '')
						return (
							<button
								type='button'
								key={entry.uid}
								title={def?.name ?? '(unknown)'}
								onClick={() =>
									selecting
										? selecting.onPick(entry)
										: setSelectedUid(entry.uid)
								}
								className={cn(
									'relative flex aspect-square cursor-pointer items-center justify-center rounded border bg-slate-950 hover:border-amber-500',
									selecting?.cursor === index
										? 'border-amber-400 ring-2 ring-amber-400'
										: 'border-slate-700',
								)}
							>
								{sprite ? (
									<SpriteCanvas sprite={sprite} className='h-10 w-10' />
								) : (
									<span className='text-lg text-slate-300'>
										{def?.glyph.symbol ?? '?'}
									</span>
								)}
								{equippedUids.has(entry.uid) && (
									<span
										title='Equipped'
										className='absolute top-0.5 left-0.5 rounded bg-amber-500 px-1 text-[10px] leading-tight font-bold text-slate-950'
									>
										E
									</span>
								)}
								{entry.quantity !== undefined && (
									<span className='absolute right-0.5 bottom-0 text-[10px] font-bold text-amber-400'>
										{entry.quantity}
									</span>
								)}
							</button>
						)
					})}
				</div>
				{entries.length === 0 && (
					<p className='py-10 text-center text-xs text-slate-600'>
						Nothing carried.
					</p>
				)}
			</div>

			{weight && (
				<div className='mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm'>
					<span className='text-slate-500 uppercase'>Carrying Capacity</span>
					<span
						className={cn(
							'font-bold',
							weight.carried >= weight.limit
								? 'text-rose-400'
								: 'text-slate-200',
						)}
					>
						{Math.round(weight.carried * 100) / 100} / {weight.limit}
					</span>
				</div>
			)}

			{selected && (
				<ItemPreview
					entry={selected}
					onClose={() => setSelectedUid(null)}
					onTrade={
						onTrade &&
						(() => {
							setSelectedUid(null)
							onTrade(selected)
						})
					}
					onDrop={
						onDrop &&
						(() => {
							setSelectedUid(null)
							onDrop(selected)
						})
					}
					equipped={equippedUids.has(selected.uid)}
					onEquip={
						canEquip && onEquip
							? () => {
									setSelectedUid(null)
									onEquip(selected)
								}
							: undefined
					}
					onUnequip={
						canEquip && onUnequip
							? () => {
									setSelectedUid(null)
									onUnequip(selected)
								}
							: undefined
					}
				/>
			)}
		</div>
	)
}
