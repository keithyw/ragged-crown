import { useEffect } from 'react'
import { EncounterViewport } from '@/components/encounter/EncounterViewport'
import { EventLog } from '@/components/log/EventLog'
import {
	CharacterCreationScreen,
	CharacterSheetScreen,
	CutSceneScreen,
	GameLayout,
	MainMenuScreen,
	PartyRosterScreen,
	SplashScreen,
} from '@/components/layout'
import { OverheadMap } from '@/components/map/OverheadMap'
import { PartyRoster } from '@/components/party/Roster'
import { getGameEngine } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

export default function App() {
	useEffect(() => {
		const engine = getGameEngine()
		engine.initialize()
		return () => engine.shutdown()
	}, [])

	const screen = useGameStore((state) => state.currentScreen)

	return (
		<>
			{screen === 'INTRO' && <SplashScreen />}
			{screen === 'MAIN_MENU' && <MainMenuScreen />}
			{screen === 'CHARACTER_CREATION' && <CharacterCreationScreen />}
			{screen === 'CHARACTER_SHEET' && <CharacterSheetScreen />}
			{screen === 'PARTY_ROSTER' && <PartyRosterScreen />}
			{screen === 'CUT_SCENE' && <CutSceneScreen />}
			{screen === 'WORLD_MAP' && (
				<GameLayout
					header={<div>{/* <Header /> */}</div>}
					mapViewport={<OverheadMap />}
					encounterViewport={<div>{<EncounterViewport />}</div>}
					eventLog={<div>{<EventLog />}</div>}
					partyRoster={<div>{<PartyRoster />}</div>}
					footer={<div>{/* <HotkeyFooter /> */}</div>}
				/>
			)}
		</>
	)
}
