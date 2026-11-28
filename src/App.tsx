import { useEffect } from 'react'
import { CommandList } from '@/components/commands/CommandList'
import { EncounterViewport } from '@/components/encounter/EncounterViewport'
import { GiveItemMenu } from '@/components/inventory/GiveItemMenu'
import { GetPrompt } from '@/components/commands/GetPrompt'
import { MovePrompt } from '@/components/commands/MovePrompt'
import { TalkPrompt } from '@/components/commands/TalkPrompt'
import { OpenPrompt } from '@/components/commands/OpenPrompt'
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
import { WORLD_COMMANDS } from '@/constants'
import { getGameEngine } from '@/engine'
import { useGameStore } from '@/store/useGameStore'

export default function App() {
	useEffect(() => {
		const engine = getGameEngine()
		engine.initialize()
		return () => engine.shutdown()
	}, [])

	const screen = useGameStore((state) => state.currentScreen)
	const inCombat = useGameStore((state) => state.encounter !== null)
	const isGiving = useGameStore((state) => state.givePool !== null)
	const isOpening = useGameStore((state) => state.openPrompt !== null)
	const isGetting = useGameStore((state) => state.getPrompt !== null)
	const isTalking = useGameStore((state) => state.talkPrompt !== null)
	const isMoving = useGameStore((state) => state.movePrompt !== null)

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
					inCombat={inCombat}
					header={<div>{/* <Header /> */}</div>}
					mapViewport={<OverheadMap />}
					encounterViewport={<div>{<EncounterViewport />}</div>}
					eventLog={<div>{<EventLog />}</div>}
					commandList={<CommandList commands={WORLD_COMMANDS} />}
					partyRoster={<div>{<PartyRoster />}</div>}
					footer={<div>{/* <HotkeyFooter /> */}</div>}
				/>
			)}
			{screen === 'WORLD_MAP' && isGiving && <GiveItemMenu />}
			{screen === 'WORLD_MAP' && isOpening && <OpenPrompt />}
			{screen === 'WORLD_MAP' && isGetting && <GetPrompt />}
			{screen === 'WORLD_MAP' && isTalking && <TalkPrompt />}
			{screen === 'WORLD_MAP' && isMoving && <MovePrompt />}
		</>
	)
}
