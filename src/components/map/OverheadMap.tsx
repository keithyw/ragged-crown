import { useMemo } from 'react'
import { MapSquare } from '@/components/map/MapSquare'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { useGameStore } from '@/store/useGameStore'
import { isSamePosition, parseZoneGrid } from '@/utils'

interface OverheadMapProps {
	title?: string
}

export const OverheadMap = ({ title = 'Overhead View' }: OverheadMapProps) => {
	const currentZone = useGameStore((state) => state.currentZone)
	const playerPosition = useGameStore((state) => state.playerPosition)
	const isMapLoading = useGameStore((state) => state.isMapLoading)

	const grid = useMemo(() => {
		return currentZone ? parseZoneGrid(currentZone) : []
	}, [currentZone])

	if (isMapLoading || !currentZone)
		return (
			<div className='flex h-full w-full items-center justify-center text-xs text-slate-500'>
				Loading...
			</div>
		)

	const { width, height } = currentZone.dimensions

	return (
		<div className='flex h-full w-full flex-col'>
			<PanelHeader title={title} />
			<div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-slate-800/80 bg-slate-950 p-2'>
				<div
					className='grid aspect-square w-full max-w-120 gap-1'
					style={{
						gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
						gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
					}}
				>
					{grid.flatMap((row) =>
						row.map((cell) => {
							const isPlayer = isSamePosition(cell.position, playerPosition)
							return (
								<MapSquare
									key={`${cell.position.x}-${cell.position.y}`}
									tile={cell.tile}
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
