import { TILE_SIZE_PX, SHAPES, SURFACES, TEXT } from '@/constants'
import type { TileDef } from '@/types'
import { cn } from '@/utils'

interface MapSquareProps {
	isPlayer: boolean
	tile?: TileDef
	useSprites?: boolean
}

const getSpriteStyle = (x: number, y: number): React.CSSProperties => ({
	backgroundPosition: `-${x * TILE_SIZE_PX}px -${y * TILE_SIZE_PX}px`,
})

export const MapSquare = ({
	isPlayer,
	tile,
	useSprites = false,
}: MapSquareProps) => {
	const baseSquare = cn(
		'w-full h-full select-none overflow-hidden',
		SHAPES.square,
		TEXT.monoBadge,
	)

	if (useSprites && tile?.spriteCoords) {
		return (
			<div
				className={cn(baseSquare, 'tile-sprite border border-black/20')}
				style={getSpriteStyle(tile.spriteCoords.x, tile.spriteCoords.y)}
				title={tile.name}
			>
				{isPlayer && (
					<span
						className={cn(
							'drop-shadow-[0_1px_1px_rgba(0,0,0,1]) z-10 text-amber-400',
						)}
					>
						@
					</span>
				)}
			</div>
		)
	}

	const theme = isPlayer
		? SURFACES.tileActive
		: tile?.color || SURFACES.tileDefault

	return (
		<div className={cn(baseSquare, theme)}>{isPlayer ? '@' : tile?.symbol}</div>
	)
}
