import { useEffect } from 'react'
import { GameLayout } from '@/components/layout/GameLayout'
import { OverheadMap } from '@/components/map/OverheadMap'
import { getGameEngine } from '@/engine'

export default function App() {
	useEffect(() => {
		const engine = getGameEngine()
		engine.initialize()
		return () => engine.shutdown()
	}, [])
	return (
		<GameLayout
			header={<div>{/* <Header /> */}</div>}
			mapViewport={<OverheadMap />}
			encounterViewport={<div>{/* <EncounterViewport /> */}</div>}
			eventLog={<div>{/* <EventLog /> */}</div>}
			partyRoster={<div>{/* <PartyRoster /> */}</div>}
			footer={<div>{/* <HotkeyFooter /> */}</div>}
		/>
	)
}
