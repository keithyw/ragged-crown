interface PanelHeaderProps {
	title: string
	subtitle?: string | React.ReactNode
	children?: React.ReactNode
}

export const PanelHeader = ({
	title,
	subtitle,
	children,
}: PanelHeaderProps) => {
	return (
		<div className='mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase'>
			<div className='flex items-center gap-2'>
				<span>{title}</span>
				{subtitle && (
					<span className='font-normal text-slate-600 normal-case'>
						• {subtitle}
					</span>
				)}
			</div>
			{children && (
				<div className='flex items-center gap-2 text-slate-400'>{children}</div>
			)}
		</div>
	)
}
