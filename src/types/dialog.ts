export interface DialogQuiz {
	prompt: string
	answer: string
	failureText: string
}

export interface DialogFrame {
	id: string
	title?: string
	text: string // Supports multi-paragraph / long text
	imagePath?: string
	quiz?: DialogQuiz
}

export interface DialogSequence {
	id: string
	frames: DialogFrame[]
	nextDialogKey?: string // For chaining sequences
	onCompleteFlag?: string // Global flag to set on save state when done
}

// Map of key -> sequence within a region JSON file (e.g. zone_a1_dialogs.json)
export type RegionDialogs = Record<string, DialogSequence>
