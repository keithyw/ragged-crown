interface OverheadMapProps {
	mapData?: number[][]
	playerPosition?: { x: number; y: number }
}

export const OverheadMap = ({
	playerPosition = { x: 5, y: 5 },
}: OverheadMapProps) => {
	// Temporary tile grid definition for visualization
	// probably should move this into a constants file down the road
	const GRID_SIZE = 11

	return (
		<div className='flex h-full w-full flex-col'>
			{/* Panel Header */}
			<div className='mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase'>
				<span>Overhead View</span>
				<span>
					Pos: ({playerPosition.x}, {playerPosition.y})
				</span>
			</div>

			{/* Grid Container */}
			<div className='flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-slate-800/80 bg-slate-950 p-2'>
				<div
					className='grid aspect-square w-full max-w-120 gap-1'
					style={{
						gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
					}}
				>
					{Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
						const x = index % GRID_SIZE
						const y = Math.floor(index / GRID_SIZE)
						const isPlayer = x === playerPosition.x && y === playerPosition.y

						return (
							<div
								key={`${x}-${y}`}
								className={`flex aspect-square items-center justify-center rounded-sm text-[10px] font-bold transition-colors duration-150 ${
									isPlayer
										? 'z-10 scale-105 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/50'
										: 'border border-slate-800/60 bg-slate-900 text-slate-700 hover:border-slate-700'
								} `}
							>
								{isPlayer ? '@' : ''}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
