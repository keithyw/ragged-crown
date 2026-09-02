import { CONTAINERS, INPUTS, SHAPES } from '@/constants'
import { cn } from '@/utils'

interface CutSceneFooterProps {
	currentFrame: number
	totalFrames: number
	hasQuiz: boolean
	onNext: () => void
}
export const CutSceneFooter = ({
	currentFrame,
	totalFrames,
	hasQuiz,
	onNext,
}: CutSceneFooterProps) => (
	<div className={cn(SHAPES.centeredBox, CONTAINERS.footer)}>
		<span>
			Frame {currentFrame} of {totalFrames}
			{!hasQuiz && (
				<button
					className={cn(INPUTS.buttons.base, INPUTS.buttons.secondary)}
					onClick={onNext}
				>
					[ SPACE ] Continue
				</button>
			)}
		</span>
	</div>
)
