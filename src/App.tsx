import { GameLayout } from '@/components/layout/GameLayout'

export default function App() {
	return (
		<GameLayout
			header={<div>{/* <Header /> */}</div>}
			mapViewport={<div>{/* <OverheadMap /> */}</div>}
			encounterViewport={<div>{/* <EncounterViewport /> */}</div>}
			eventLog={<div>{/* <EventLog /> */}</div>}
			partyRoster={<div>{/* <PartyRoster /> */}</div>}
			footer={<div>{/* <HotkeyFooter /> */}</div>}
		/>
	)
}
