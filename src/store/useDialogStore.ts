import { create } from 'zustand'
import type { DialogSequence, RegionDialogs } from '@/types'

interface DialogStore {
	activeSequence: DialogSequence | null
	currentFrameIndex: number
	dialogs: RegionDialogs | null
	setDialogs: (dialogs: RegionDialogs) => void
	getSequence: (key: string) => DialogSequence | null
	setActiveSequence: (sequence: DialogSequence | null) => void
	setFrameIndex: (index: number) => void
	reset: () => void
}

export const useDialogStore = create<DialogStore>((set, get) => ({
	activeSequence: null,
	currentFrameIndex: 0,
	dialogs: null,
	setDialogs: (dialogs) => set({ dialogs }),
	getSequence: (key) => get().dialogs?.[key] || null,
	setActiveSequence: (sequence) =>
		set({ activeSequence: sequence, currentFrameIndex: 0 }),
	setFrameIndex: (index) => set({ currentFrameIndex: index }),
	reset: () => set({ activeSequence: null, currentFrameIndex: 0 }),
}))
