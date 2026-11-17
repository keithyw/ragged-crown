import { SpriteCanvas } from '@/components/map/SpriteCanvas'
import { useContentStore } from '@/store/useContentStore'
import type { InventoryEntry } from '@/types'

// A character's inventory ([Inventory 9]): one cell per entry with its sprite
// (or glyph symbol) and a quantity badge. Display only; the grid scrolls.
export const InventoryPanel = ({ entries }: { entries: InventoryEntry[] }) => {
	const items = useContentStore((state) => state.items)
	const sprites = useContentStore((state) => state.sprites)

	return (
		<div className='col-span-8 flex min-h-0 flex-col rounded border border-slate-800 bg-slate-900/40 p-5'>
			<div className='flex items-center justify-between border-b border-slate-800 pb-2'>
				<h3 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					Inventory
				</h3>
				<span className='text-xs text-slate-500'>{entries.length} items</span>
			</div>

			{/* Scrolls when there are more cells than fit */}
			<div className='mt-4 min-h-0 flex-1 overflow-y-auto'>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2'>
					{entries.map((entry) => {
						const def = items.get(entry.itemId)
						const sprite = sprites.get(def?.spriteId ?? '')
						return (
							<div
								key={entry.uid}
								title={def?.name ?? '(unknown)'}
								className='relative flex aspect-square items-center justify-center rounded border border-slate-700 bg-slate-950'
							>
								{sprite ? (
									<SpriteCanvas sprite={sprite} className='h-10 w-10' />
								) : (
									<span className='text-lg text-slate-300'>
										{def?.glyph.symbol ?? '?'}
									</span>
								)}
								{entry.quantity !== undefined && (
									<span className='absolute right-0.5 bottom-0 text-[10px] font-bold text-amber-400'>
										{entry.quantity}
									</span>
								)}
							</div>
						)
					})}
				</div>
				{entries.length === 0 && (
					<p className='py-10 text-center text-xs text-slate-600'>
						Nothing carried.
					</p>
				)}
			</div>
		</div>
	)
}
