import type { Glyph } from '@shared/types'
import { SHAPES, SURFACES, TEXT } from '@/constants'
import { cn } from '@/utils'

interface MapSquareProps {
	isPlayer: boolean
	glyph?: Glyph
	name?: string
}

// TODO [Game 6]: draw the def's sprite instead of the glyph.
export const MapSquare = ({ isPlayer, glyph, name }: MapSquareProps) => {
	const baseSquare = cn(
		'w-full h-full select-none overflow-hidden',
		SHAPES.square,
		TEXT.monoBadge,
	)

	const theme = isPlayer
		? SURFACES.tileActive
		: glyph
			? cn(glyph.color, glyph.bg)
			: SURFACES.tileDefault

	return (
		<div className={cn(baseSquare, theme)} title={name}>
			{isPlayer ? '@' : glyph?.symbol}
		</div>
	)
}
