import { GameLayout } from '@/components/layout/GameLayout'
import { OverheadMap } from '@/components/map/OverheadMap'

export default function App() {
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
