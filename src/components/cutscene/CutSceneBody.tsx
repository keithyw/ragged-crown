import { TEXT } from '@/constants'
import { cn } from '@/utils'

interface CutSceneBodyProps {
	title?: string
	text: string
}
export const CutSceneBody = ({ title, text }: CutSceneBodyProps) => (
	<div className='space-y-r flex-1 overflow-y-auto p-6'>
		{title && <h2 className={cn(TEXT.paragraghTitle)}>{title}</h2>}
		<div className={cn(TEXT.paragraph)}>
			{text.split('\n\n').map((paragraph, idx) => (
				<p key={idx}>{paragraph}</p>
			))}
		</div>
	</div>
)
