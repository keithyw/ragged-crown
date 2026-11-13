import { useEffect, useRef } from 'react'
import { EGA_PALETTE, SPRITE_SIZE } from '@/constants'
import type { Sprite } from '@/types'

// Ported from the tools' `SpriteCanvas`: one canvas pixel per sprite pixel,
// scaled up crisp by the caller's size. Transparent cells show what is behind.
export const SpriteCanvas = ({
	sprite,
	className,
}: {
	sprite: Sprite
	className?: string
}) => {
	const canvas = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const ctx = canvas.current?.getContext('2d')
		if (!ctx) return
		ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
		sprite.pixels.forEach((p, i) => {
			const index =
				p ?? (sprite.background === 'transparent' ? null : sprite.background)
			if (index === null) return
			ctx.fillStyle = EGA_PALETTE[index]
			ctx.fillRect(i % SPRITE_SIZE, Math.floor(i / SPRITE_SIZE), 1, 1)
		})
	}, [sprite])

	return (
		<canvas
			ref={canvas}
			width={SPRITE_SIZE}
			height={SPRITE_SIZE}
			className={className}
			style={{ imageRendering: 'pixelated' }}
		/>
	)
}
