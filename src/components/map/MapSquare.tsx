import type { BaseDef } from '@shared/types'
import { SHAPES, SURFACES, TEXT } from '@/constants'
import { cn } from '@/utils'
import { SpriteCanvas } from '@/components/map/SpriteCanvas'
import { useContentStore } from '@/store/useContentStore'

type Appearance = Pick<BaseDef, 'name' | 'glyph' | 'spriteId'>

interface MapSquareProps {
	isPlayer: boolean
	terrain?: Appearance
	/** The top of the cell's stack. */
	top?: Appearance
}

/** A def's sprite if it has one that exists, otherwise its glyph. */
const Layer = ({ def }: { def: Appearance }) => {
	const sprite = useContentStore((s) => s.sprites.get(def.spriteId ?? ''))
	return sprite ? (
		<SpriteCanvas sprite={sprite} className='h-full w-full' />
	) : (
		<div
			className={cn(
				'flex h-full w-full items-center justify-center',
				def.glyph.color,
				def.glyph.bg,
			)}
		>
			{def.glyph.symbol}
		</div>
	)
}

export const MapSquare = ({ isPlayer, terrain, top }: MapSquareProps) => {
	const hasTopSprite = useContentStore(
		(s) => !!top?.spriteId && s.sprites.has(top.spriteId),
	)
	const baseSquare = cn(
		'relative w-full h-full select-none overflow-hidden',
		SHAPES.square,
		TEXT.monoBadge,
	)
	const title = (top ?? terrain)?.name

	if (isPlayer) {
		return (
			<div className={cn(baseSquare, SURFACES.tileActive)} title={title}>
				@
			</div>
		)
	}

	// A top glyph covers the cell (DATA-MODEL 2.1). A top sprite is drawn over
	// the terrain, so its transparent pixels show the ground.
	if (top && !hasTopSprite) {
		return (
			<div className={baseSquare} title={title}>
				<Layer def={top} />
			</div>
		)
	}

	return (
		<div className={cn(baseSquare, SURFACES.tileDefault)} title={title}>
			{terrain && <Layer def={terrain} />}
			{top && (
				<div className='absolute inset-0'>
					<Layer def={top} />
				</div>
			)}
		</div>
	)
}
