import { CONTAINERS, INPUTS, TEXT } from '@/constants'
import { cn } from '@/utils'
import { ErrorSection } from '@/components/ui'

interface CutSceneQuizProps {
	prompt: string
	value: string
	error?: string
	onChange: (value: string) => void
	onSubmit: () => void
}

export const CutSceneQuiz = ({
	prompt,
	value,
	error,
	onChange,
	onSubmit,
}: CutSceneQuizProps) => (
	<div className={cn(CONTAINERS.quizSection)}>
		<label className={cn(TEXT.quizLabel)}>{prompt}</label>
		<div className='flex gap-2'>
			<input
				type='text'
				value={value}
				className={cn(INPUTS.text.base, INPUTS.text.colors)}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
				autoFocus
			/>
			<button
				className={cn(INPUTS.buttons.base, INPUTS.buttons.primary)}
				onClick={onSubmit}
			>
				Submit
			</button>
			<ErrorSection error={error} />
		</div>
	</div>
)
