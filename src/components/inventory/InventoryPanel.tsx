// First look at the character inventory ([Inventory 9]). Display only, no data
// yet: entries will be drawn as cells (sprite, quantity badge) in the grid.
export const InventoryPanel = () => {
	return (
		<div className='col-span-8 flex min-h-0 flex-col rounded border border-slate-800 bg-slate-900/40 p-5'>
			<div className='flex items-center justify-between border-b border-slate-800 pb-2'>
				<h3 className='text-xs font-bold tracking-widest text-amber-500 uppercase'>
					Inventory
				</h3>
				<span className='text-xs text-slate-500'>0 items</span>
			</div>

			{/* Scrolls when there are more cells than fit */}
			<div className='mt-4 min-h-0 flex-1 overflow-y-auto'>
				<div className='grid grid-cols-[repeat(auto-fill,minmax(4rem,1fr))] gap-2'>
					{/* Entries go here, one cell each */}
				</div>
				<p className='py-10 text-center text-xs text-slate-600'>
					Nothing carried.
				</p>
			</div>
		</div>
	)
}
