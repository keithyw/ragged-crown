// ============================================================================
// 1. THE PALETTE (Limited Retro Color Hierarchy)
// ============================================================================
// Dominant: Slate-950 (Deep Void), Slate-900 (Panel Dark)
// Borders: Slate-800 (Subtle), Amber-600/40 (Primary Frames)
// Accent/Interactive: Amber-500 (Gold), Amber-300 (Highlight)
// Status: Rose-400 (Error/Danger), Emerald-500 (Health/OK)

export const COLOR = {
	bgVoid: 'bg-slate-950',
	bgPanel: 'bg-slate-900/90',
	bgAccent: 'bg-amber-950/80',
	borderSubtle: 'border-slate-800',
	borderPrimary: 'border-amber-600/40',
	borderFocus: 'focus:border-amber-500',
	textGold: 'text-amber-500',
	textGoldBright: 'text-amber-300',
	textBody: 'text-slate-300',
	textMuted: 'text-slate-500',
	textError: 'text-rose-400',
} as const

// ============================================================================
// 2. ATOMIC BRICKS (Base Shapes, Typography, & Inputs)
// ============================================================================

export const SHAPES = {
	center: 'flex items-center justify-center',
	between: 'flex items-center justify-between',
	colCenter: 'flex flex-col items-center justify-center',
	colBetween: 'flex flex-col justify-between',
	screenBase:
		'flex h-screen w-screen bg-slate-950 p-6 font-mono text-slate-100',
} as const

export const TYPOGRAPHY = {
	title: `${COLOR.textGold} text-xl font-bold pb-2 border-b ${COLOR.borderSubtle}`,
	label: `${COLOR.textGoldBright} block text-xs font-bold`,
	body: `${COLOR.textBody} text-base leading-relaxed space-y-3`,
	muted: `${COLOR.textMuted} text-xs`,
	error: `${COLOR.textError} text-xs font-bold`,
} as const

export const BUTTONS = {
	base: 'rounded border px-4 py-2 text-xs font-bold transition-colors',
	primary:
		`border-amber-500 bg-amber-950/80 ${COLOR.textGoldBright} ` +
		'hover:bg-amber-500 hover:text-slate-950',
	secondary:
		`${COLOR.borderSubtle} bg-slate-800 text-slate-200 ` +
		'hover:border-slate-500 hover:bg-slate-700',
} as const

export const INPUTS = {
	text:
		`w-full rounded border ${COLOR.borderSubtle} ${COLOR.bgVoid} ` +
		`px-3 py-2 text-sm ${COLOR.textGoldBright} outline-none ${COLOR.borderFocus}`,
} as const

// ============================================================================
// 3. ASSEMBLIES (Pre-built Layout Components)
// ============================================================================

export const CONTAINERS = {
	// Master Panel Container (CutScenes, Dialogs, Large Modals)
	panelOuter:
		`flex flex-col h-full max-h-[85vh] w-full max-w-5xl ` +
		`overflow-hidden rounded-lg border-2 ${COLOR.borderPrimary} ` +
		`${COLOR.bgPanel} shadow-2xl`,

	// Standard Header bar
	header:
		`relative flex h-64 w-full shrink-0 ${SHAPES.between} ` +
		`border-b ${COLOR.borderSubtle} ${COLOR.bgVoid} p-4`,

	// Standard Footer bar
	footer:
		`flex shrink-0 ${SHAPES.between} border-t ${COLOR.borderSubtle} ` +
		`${COLOR.bgVoid} px-6 py-3 ${TYPOGRAPHY.muted}`,

	// Drawer section for quizzes or interactive prompts
	quizSection: `shrink-0 border-t border-amber-900/50 bg-amber-950/30 p-4 space-y-2`,
} as const
