// src/components/log/EventLog.tsx
import React, { useEffect, useRef } from 'react'
import { PanelHeader } from '@/components/ui/PanelHeader'
import { SHAPES, SURFACES } from '@/constants'
import { useGameStore } from '@/store/useGameStore'
import { cn } from '@/utils'

export const EventLog: React.FC = () => {
	// The store keeps the newest first; the log reads top to bottom, so the
	// last action is at the bottom ([Game 19]).
	const newestFirst = useGameStore((state) => state.logs)
	const latestCount = useGameStore((state) => state.latestLogCount)
	const eventLog = [...newestFirst].reverse()
	const logContainerRef = useRef<HTMLDivElement>(null)

	// Newest messages are at the bottom, so keep the view there
	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
		}
	}, [newestFirst])

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
								// The last command stays highlighted until the next one logs.
								index >= eventLog.length - latestCount &&
									'rounded-sm border-l-2 border-amber-300 bg-amber-400/20 pl-2 text-white',
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
