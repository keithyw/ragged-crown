import { useEffect } from 'react'
import type { ArmorDef, ItemDef, WeaponDef } from '@shared/types'
import { SpriteCanvas } from '@/components/map/SpriteCanvas'
import { inputManager } from '@/engine'
import { useContentStore } from '@/store/useContentStore'
import type { InventoryEntry } from '@/types'

const WEAPON_FLAGS: [keyof WeaponDef, string][] = [
	['isTwoHanded', 'two-handed'],
	['isMissile', 'missile'],
	['isThrown', 'thrown'],
]

// Rounds away float noise (0.1 x 3) without showing needless decimals.
const round = (n: number) => Math.round(n * 100) / 100

// Details of one inventory entry ([Inventory 9]). Display only for now;
// escape or a click outside closes it. Built for the game, not shared with
// the tools' modals.
export const ItemPreview = ({
	entry,
	onClose,
	onTrade,
	onDrop,
}: {
	entry: InventoryEntry
	onClose: () => void
	/** Trade and Drop are offered only when these are given. */
	onTrade?: () => void
	onDrop?: () => void
}) => {
	// The store types every stored item as ItemDef, but weapons and armor live
	// in the same collection, told apart by `kind`.
	const def = useContentStore((state) => state.items.get(entry.itemId)) as
		ItemDef | WeaponDef | ArmorDef | undefined
	const sprite = useContentStore((state) =>
		state.sprites.get(def?.spriteId ?? ''),
	)

	// A quest item can't be dropped ([Inventory 22]).
	const canDrop = onDrop && !def?.isQuestItem

	useEffect(() => {
		// The latest handler runs first, so the sheet's keys don't fire.
		const unbind = inputManager.registerHandler((key) => {
			const k = key.toLowerCase()
			if (key === 'Escape') onClose()
			else if (k === 't') onTrade?.()
			else if (k === 'd' && canDrop) onDrop?.()
			return true
		})
		return () => unbind()
	}, [onClose, onTrade, onDrop, canDrop])

	const quantity = entry.quantity ?? 1
	const weapon = def?.kind === 'weapon' ? def : undefined
	const armor = def?.kind === 'armor' ? def : undefined
	const flags = weapon
		? WEAPON_FLAGS.filter(([key]) => weapon[key]).map(([, label]) => label)
		: []

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 font-mono'
			onClick={onClose}
		>
			<div
				className='w-full max-w-md space-y-4 rounded border border-amber-500 bg-slate-900 p-5 shadow-2xl'
				onClick={(e) => e.stopPropagation()}
			>
				<div className='flex items-center gap-4'>
					<div className='flex h-16 w-16 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-950'>
						{sprite ? (
							<SpriteCanvas sprite={sprite} className='h-14 w-14' />
						) : (
							<span className='text-3xl text-slate-300'>
								{def?.glyph.symbol ?? '?'}
							</span>
						)}
					</div>
					<div>
						<h4 className='text-lg font-bold text-amber-400'>
							{def?.name ?? '(unknown item)'}
						</h4>
						{def?.isQuestItem && (
							<span className='text-xs font-bold tracking-widest text-sky-400 uppercase'>
								Quest item
							</span>
						)}
					</div>
				</div>

				{def?.description && (
					<p className='text-sm text-slate-300'>{def.description}</p>
				)}

				{def && (
					<dl className='space-y-1 text-xs'>
						{entry.quantity !== undefined && (
							<Row label='Quantity' value={String(entry.quantity)} />
						)}
						<Row
							label='Weight'
							value={
								quantity > 1
									? `${round(def.weight)} each, ${round(def.weight * quantity)} total`
									: String(round(def.weight))
							}
						/>
						{weapon && (
							<>
								<Row label='Type' value={weapon.type} />
								<Row
									label='Damage'
									value={`${weapon.damage.count}d${weapon.damage.die}`}
								/>
								{flags.length > 0 && (
									<Row label='Flags' value={flags.join(', ')} />
								)}
							</>
						)}
						{armor && (
							<>
								<Row label='Worn on' value={armor.type} />
								<Row label='Defense' value={String(armor.defenseValue)} />
							</>
						)}
					</dl>
				)}

				{(onTrade || onDrop) && (
					<div className='flex gap-2'>
						{onTrade && (
							<button
								type='button'
								onClick={onTrade}
								className='rounded border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200 hover:border-amber-500'
							>
								[ T ] Trade
							</button>
						)}
						{onDrop && (
							<button
								type='button'
								onClick={onDrop}
								disabled={!canDrop}
								title={canDrop ? undefined : "A quest item can't be dropped"}
								className='rounded border border-rose-900 bg-rose-950/40 px-3 py-1 text-xs font-bold text-rose-400 hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-rose-950/40'
							>
								[ D ] Drop
							</button>
						)}
					</div>
				)}

				<p className='text-xs text-slate-600'>[ESC] Close</p>
			</div>
		</div>
	)
}

const Row = ({ label, value }: { label: string; value: string }) => (
	<div className='flex justify-between border-b border-slate-800/60 pb-1'>
		<dt className='text-slate-500 uppercase'>{label}</dt>
		<dd className='font-bold text-slate-200'>{value}</dd>
	</div>
)
