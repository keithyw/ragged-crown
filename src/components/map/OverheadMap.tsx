import { MapSquare } from '@/components/map/MapSquare'
import { PanelHeader } from '@/components/ui/PanelHeader'
import {
	DEFAULT_VIEWPORT_GRID_SIZE,
	DEFAULT_STARTING_POSITION,
} from '@/constants'
import { indexToCoords, isSamePosition, type Position } from '@/utils'

interface OverheadMapProps {
	gridSize?: number
	locationName?: string
	mapData?: number[][]
	playerPosition?: Position
	title?: string
}

export const OverheadMap = ({
	locationName,
	playerPosition = DEFAULT_STARTING_POSITION,
	gridSize = DEFAULT_VIEWPORT_GRID_SIZE,
	title = 'Overhead View',
}: OverheadMapProps) => {
	const totalCells = gridSize * gridSize

	return (
		<div className='flex h-full w-full flex-col'>
			<PanelHeader title={title} subtitle={locationName} />
			<div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-slate-800/80 bg-slate-950 p-2'>
				<div
					className='grid aspect-square w-full max-w-120 gap-1'
					style={{
						gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
					}}
				>
					{Array.from({ length: totalCells }).map((_, index) => {
						const coords = indexToCoords(index, gridSize)
						const isPlayer = isSamePosition(coords, playerPosition)

						return (
							<MapSquare key={`${coords.x}-${coords.y}`} isPlayer={isPlayer} />
						)
					})}
				</div>
			</div>
		</div>
	)
}
