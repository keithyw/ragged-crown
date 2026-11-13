import { useEffect, useMemo, useState } from 'react'
import { MapSquare } from '@/components/map/MapSquare'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SPRITE_SIZE } from '@/constants'
import { useContentStore } from '@/store/useContentStore'
import { useGameStore } from '@/store/useGameStore'
import { isSamePosition, parseZoneGrid } from '@/utils'

const CELL_GAP_PX = 4 // gap-1 between cells
const MAX_SCALE = 4
// What the rest of the world screen takes from the window (see GameLayout):
// the roster (w-96) and the middle panel's minimum, plus padding and borders.
const CHROME_X_PX = 384 + 320 + 12 + 24 + 28 + 18
// Body padding, panel padding and border, panel header, inner padding.
const CHROME_Y_PX = 24 + 28 + 40 + 18

/**
 * Whole-number sprite scale (1x to 4x) so the zone fits the window: sprites
 * stay crisp, a small zone grows, a big one shrinks, and width and height are
 * fitted separately for zones that aren't square.
 */
const useMapScale = (width: number, height: number): number => {
	const [win, setWin] = useState({
		w: window.innerWidth,
		h: window.innerHeight,
	})
	useEffect(() => {
		const onResize = () =>
			setWin({ w: window.innerWidth, h: window.innerHeight })
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [])

	const extent = (cells: number, scale: number) =>
		cells * SPRITE_SIZE * scale + Math.max(0, cells - 1) * CELL_GAP_PX
	let scale = 1
	for (let s = 2; s <= MAX_SCALE; s++) {
		if (
			extent(width, s) <= win.w - CHROME_X_PX &&
			extent(height, s) <= win.h - CHROME_Y_PX
		) {
			scale = s
		}
	}
	return scale
}

interface OverheadMapProps {
	title?: string
}

export const OverheadMap = ({ title = 'Overhead View' }: OverheadMapProps) => {
	const currentZone = useGameStore((state) => state.currentZone)
	const playerPosition = useGameStore((state) => state.playerPosition)
	const isMapLoading = useGameStore((state) => state.isMapLoading)
	const runtimePlacements = useGameStore((state) => state.runtimePlacements)
	const tiles = useContentStore((state) => state.tiles)
	const items = useContentStore((state) => state.items)
	const entities = useContentStore((state) => state.entities)

	const grid = useMemo(() => {
		return currentZone
			? parseZoneGrid(
					{ tiles, items, entities },
					currentZone,
					runtimePlacements,
				)
			: []
	}, [currentZone, runtimePlacements, tiles, items, entities])

	const { width, height } = currentZone?.dimensions || { width: 0, height: 0 }
	const cellPx = SPRITE_SIZE * useMapScale(width, height)

	if (isMapLoading || !currentZone)
		return (
			<div className='flex h-full w-full items-center justify-center text-xs text-slate-500'>
				Loading...
			</div>
		)

	console.log(playerPosition)

	return (
		<div className='flex h-full w-full flex-col'>
			<PanelHeader title={title} />
			<div className='w-fit overflow-hidden rounded border border-slate-800/80 bg-slate-950 p-2'>
				<div
					className='grid gap-1'
					style={{
						gridTemplateColumns: `repeat(${width}, ${cellPx}px)`,
						gridTemplateRows: `repeat(${height}, ${cellPx}px)`,
					}}
				>
					{grid.flatMap((row) =>
						row.map((cell) => {
							const isPlayer = isSamePosition(cell.position, playerPosition)
							return (
								<MapSquare
									key={`${cell.position.x}-${cell.position.y}`}
									terrain={cell.terrain}
									top={cell.top}
									isPlayer={isPlayer}
								/>
							)
						}),
					)}
				</div>
			</div>
		</div>
	)
}
