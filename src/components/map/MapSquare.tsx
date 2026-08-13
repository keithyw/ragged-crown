interface MapSquareProps {
	isPlayer: boolean
	// Placeholder for future tile types (e.g., 'GRASS' | 'WATER' | 'MOUNTAIN')
	tileType?: string
}

export const MapSquare = ({ isPlayer }: MapSquareProps) => {
	const baseStyle =
		'aspect-square rounded-sm flex items-center justify-center text-[10px] font-bold transition-colors duration-150'

	const stateStyle = isPlayer
		? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/50 scale-105 z-10'
		: 'bg-slate-900 border border-slate-800/60 text-slate-700 hover:border-slate-700'

	return (
		<div className={`${baseStyle} ${stateStyle}`}>{isPlayer ? '@' : ''}</div>
	)
}
