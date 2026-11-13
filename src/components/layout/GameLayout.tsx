interface GameLayoutProps {
	/** Combat shows the encounter in the middle and the log along the bottom. */
	inCombat: boolean
	header: React.ReactNode
	mapViewport: React.ReactNode
	encounterViewport: React.ReactNode
	eventLog: React.ReactNode
	commandList: React.ReactNode
	partyRoster: React.ReactNode
	footer: React.ReactNode
}

export const GameLayout = ({
	inCombat,
	header,
	mapViewport,
	encounterViewport,
	eventLog,
	commandList,
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
					{/* The map is sized to its content; the middle takes the rest */}
					<div className='flex min-h-0 flex-1 items-start gap-3'>
						{/* The command list is as wide as the map and no wider */}
						<div className='flex shrink-0 flex-col gap-3'>
							<div className='flex flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
								{mapViewport}
							</div>
							{!inCombat && (
								<div className='flex w-0 min-w-full flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
									{commandList}
								</div>
							)}
						</div>
						<div className='flex min-w-0 flex-1 flex-col self-stretch rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
							{inCombat ? encounterViewport : eventLog}
						</div>
					</div>

					{/* In combat the middle holds the encounter, so the log moves down */}
					{inCombat && (
						<div className='flex h-32 flex-col rounded-lg border-2 border-slate-800 bg-slate-900 p-3'>
							{eventLog}
						</div>
					)}
				</div>

				{/* Right Column: Party Roster */}
				<aside className='flex w-96 flex-col border-l border-slate-800 bg-slate-900'>
					{partyRoster}
				</aside>
			</div>

			{/* Footer Hotkeys */}
			{footer}
		</div>
	)
}
