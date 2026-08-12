interface GameLayoutProps {
	header: React.ReactNode
	mapViewport: React.ReactNode
	encounterViewport: React.ReactNode
	eventLog: React.ReactNode
	partyRoster: React.ReactNode
	footer: React.ReactNode
}

export const GameLayout = ({
	header,
	mapViewport,
	encounterViewport,
	eventLog,
	partyRoster,
	footer,
}: GameLayoutProps) => {
	return (
		<div className='flex h-screen flex-col overflow-hidden bg-slate-950 font-mono text-slate-100 select-none'>
			{/* Top Header */}
			{header}

			{/* Main Content Body */}
			<div className='flex min-h-0 flex-1'>
				{/* Left/Center Main Column */}
				<div className='flex min-w-0 flex-1 flex-col gap-3 p-3'>
					{/* Viewports Grid */}
					<div className='grid min-h-0 flex-1 grid-cols-12 gap-3'>
						<div className='col-span-7 flex flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
							{mapViewport}
						</div>
						<div className='col-span-5 flex flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
							{encounterViewport}
						</div>
					</div>

					{/* Bottom Event Log */}
					<div className='flex h-32 flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
						{eventLog}
					</div>
				</div>

				{/* Right Column: Party Roster */}
				<aside className='flex w-80 flex-col border-l border-slate-800 bg-slate-900'>
					{partyRoster}
				</aside>
			</div>

			{/* Footer Hotkeys */}
			{footer}
		</div>
	)
}
