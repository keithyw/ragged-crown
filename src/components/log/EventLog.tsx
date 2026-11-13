// src/components/log/EventLog.tsx
import React, { useEffect, useRef } from 'react'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES } from '@/constants'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/utils'

export const EventLog: React.FC = () => {
	const eventLog = useGameStore((state) => state.logs)
	const logContainerRef = useRef<HTMLDivElement>(null)

	// Newest messages come first, so keep the view at the top
	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = 0
		}
		console.log('logs', eventLog)
	}, [eventLog])

	return (
		<div className={cn(SHAPES.panel, SURFACES.panelDark)}>
			<PanelHeader title='Event Log' subtitle={`${eventLog.length} messages`} />

			<div
				ref={logContainerRef}
				className='flex-1 scrollbar-thin scrollbar-thumb-slate-800 space-y-1 overflow-y-auto p-3 font-mono text-xs'
			>
				{eventLog.length === 0 ? (
					<div className='text-slate-600 italic'>No events recorded...</div>
				) : (
					eventLog.map((entry, index) => (
						<div
							key={index}
							className={cn(
								'leading-relaxed wrap-break-word',
								entry.startsWith('>')
									? 'font-semibold text-amber-400'
									: 'text-slate-300',
							)}
						>
							{entry}
						</div>
					))
				)}
			</div>
		</div>
	)
}
