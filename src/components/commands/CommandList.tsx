import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES, type CommandHelp } from '@/constants'
import { cn } from '@/utils'

interface CommandListProps {
	commands: CommandHelp[]
}

export const CommandList = ({ commands }: CommandListProps) => (
	<div className={cn(SHAPES.panel, SURFACES.panelDark, 'p-3')}>
		<PanelHeader title='Commands' />
		<dl className='grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 font-mono text-xs'>
			{commands.map(({ keys, label }) => (
				<div key={keys} className='contents'>
					<dt className='font-semibold text-amber-400'>{keys}</dt>
					<dd className='text-slate-300'>{label}</dd>
				</div>
			))}
		</dl>
	</div>
)
