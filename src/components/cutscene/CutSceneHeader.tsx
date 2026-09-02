import { CONTAINERS } from '@/constants'
import { cn } from '@/utils'

interface CutSceneHeaderProps {
	imagePath?: string
}
export const CutSceneHeader = ({ imagePath }: CutSceneHeaderProps) => (
	<div className={cn(CONTAINERS.header)}>
		{imagePath ? (
			<img
				src={imagePath}
				alt='Cutscene Still'
				className='h-full object-contain'
			/>
		) : (
			<span className='text-xs text-slate-600'>
				[ SCENE ARTWORK PLACEHOLDER ]
			</span>
		)}
	</div>
)
