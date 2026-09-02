import { useCallback, useEffect, useState } from 'react'
import { CONTAINERS } from '@/constants'
import {
	CutSceneBody,
	CutSceneFooter,
	CutSceneHeader,
	CutSceneQuiz,
} from '@/components/cutscene'
import { getGameEngine, inputManager } from '@/engine'
import { SaveGameService } from '@/services/SaveGameService'
import { useDialogStore } from '@/store/useDialogStore'
import { useGameStore } from '@/store/useGameStore'
import type { FlagValue } from '@/types'
import { cn } from '@/utils'

export const CutSceneScreen = () => {
	const activeSequence = useDialogStore((state) => state.activeSequence)
	const frameIndex = useDialogStore((state) => state.currentFrameIndex)
	const setFrameIndex = useDialogStore((state) => state.setFrameIndex)
	const resetDialog = useDialogStore((state) => state.reset)

	const savedGame = useGameStore((state) => state.savedGame)
	const [quizInput, setQuizInput] = useState('')
	const [errorMessage, setErrorMessage] = useState('')

	const currentFrame = activeSequence?.frames[frameIndex]

	const handleAdvance = useCallback(() => {
		if (!activeSequence || !currentFrame || !savedGame) return

		// 1. Handle Quiz Validation if frame requires it
		if (currentFrame.quiz) {
			if (
				quizInput.trim().toLowerCase() !==
				currentFrame.quiz.answer.toLowerCase()
			) {
				setErrorMessage(currentFrame.quiz.failureText)
				return
			}
		}

		// Clear temporary error & input
		setErrorMessage('')
		setQuizInput('')

		// 2. Advance to Next Frame OR Wrap Up Cutscene
		if (frameIndex < activeSequence.frames.length - 1) {
			setFrameIndex(frameIndex + 1)
		} else {
			// Mutate active save state directly
			const flagsToUpdate: Record<string, FlagValue> = {}
			if (activeSequence.onCompleteFlag) {
				flagsToUpdate[activeSequence.onCompleteFlag] = true
			}
			const updatedSave = {
				...savedGame,
				worldState: {
					...savedGame.worldState,
					flags: {
						...savedGame.worldState.flags,
						...flagsToUpdate,
					},
				},
				metadata: {
					...savedGame.metadata,
					updatedAt: Date.now(),
				},
			}

			// Update Store & Local Storage
			useGameStore.setState({ savedGame: updatedSave })
			SaveGameService.saveGame(updatedSave)
			resetDialog()
			getGameEngine().enterWorldMode()
		}
	}, [
		activeSequence,
		currentFrame,
		frameIndex,
		quizInput,
		resetDialog,
		savedGame,
		setFrameIndex,
	])

	useEffect(() => {
		const unbind = inputManager.registerHandler((key) => {
			if (!currentFrame?.quiz && (key === 'Enter' || key === ' ')) {
				handleAdvance()
				return true
			}
			return false
		})
		return () => unbind()
	}, [currentFrame, frameIndex, handleAdvance, quizInput])

	if (!currentFrame || !activeSequence) return null

	return (
		<div className={cn(CONTAINERS.cutScene)}>
			<div className={cn(CONTAINERS.panelOuter)}>
				<CutSceneHeader imagePath={currentFrame.imagePath} />
				<CutSceneBody title={currentFrame.title} text={currentFrame.text} />
				{currentFrame.quiz && (
					<CutSceneQuiz
						prompt={currentFrame.quiz.prompt}
						value={quizInput}
						error={errorMessage}
						onChange={setQuizInput}
						onSubmit={handleAdvance}
					/>
				)}
				<CutSceneFooter
					currentFrame={frameIndex + 1}
					totalFrames={activeSequence.frames.length}
					hasQuiz={!!currentFrame.quiz}
					onNext={handleAdvance}
				/>
			</div>
		</div>
	)
}
