export const CONTAINERS = {
	footer:
		'border-t border-slate-800 bg-slate-950 px-6 py-3 text-xs text-slate-500',
	header:
		'relative flex h-64 w-full shrink-0 items- center ' +
		'justify-between border-b border-slate-800 bg-slate-950 p-4',
	quizSection: 'border-t border-amber-900/50 bg-amber-950/30 p-4 space-y-2',
	main: 'flex flex-col min-h-screen items-center justify-between border-4 bg-slate-950 p-6 font-mono text-slate-100',
	cutScene:
		'flex h-screen w-screen items-center justify-center bg-slate-950 p-6',
	panelOuter:
		'flex flex-col h-full max-h-[85vh] w-full max-w-5xl overflow-hidden' +
		' rounded-lg border-2 border-amber-600/40 bg-slate-900/90 shadow-2xl',
} as const

// className='flex min-h-screen flex-col items-center justify-between border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'
// <div className='flex min-h-screen flex-col items-center justify-between border-4 border-slate-800 bg-slate-950 p-6 font-mono text-slate-100'>
// <div className='flex min-h-screen flex-col items-center justify-center border-4 border-slate-800 bg-slate-950 p-8 font-mono text-slate-100'>
// <div className='flex h-screen w-screen flex-col items-center justify-center border-4 bg-slate-950 p-6 font-mono text-slate-100'>
// <div className='flex h-screen flex-col overflow-hidden bg-slate-950 font-mono text-slate-100 select-none'>

// export const PANEL_OUTER =
//   'flex h-full max-h-[85vh] w-full max-w-5xl ' +
//   'flex-col overflow-hidden rounded-lg border-2 ' +
//   'border-amber-600/40 bg-slate-900/90 shadow-2xl'

export const INPUTS = {
	buttons: {
		base: 'rounded border px-4 py-2 text-xs font-bold transition-colors',
		primary:
			'border-ambder-500 bg-amber-950/80 text-amber-300 hover:bg-amber-500 hover:text-slate-950',
		secondary:
			'border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-500 hover:bg-slate-700',
	},
	text: {
		base: 'w-full rounded border px-3 py-2 text-sm outline-none',
		colors:
			'border-slate-700 bg-slate-950 text-amber-300 focus:border-amber-500',
	},
} as const

/**
 * Atomic layout primitives & shapes.
 * Zero colors, zero sizing — purely layout geometry.
 */
export const SHAPES = {
	// A centered flex box for icons, grid items, and avatars
	centeredBox: 'flex items-center justify-center',
	// Aspect-ratio square container
	square: 'aspect-square flex items-center justify-center relative',
	// Panel container frame
	panel: 'flex flex-col h-full w-full overflow-hidden border',
} as const

/**
 * Text & typography scale.
 */
export const TEXT = {
	error: 'text-xs text-rose-400',
	hpAlive: 'text-emerald-500/50',
	hpDead: 'text-red-500/50',
	hpPercentGood: 'bg-emerald-500',
	hpPercentWarning: 'bg-amber-500',
	hpPercentBad: 'bg-red-500',
	monoBadge: 'font-mono text-xs font-bold leading-none',
	panelHeader: 'text-xs uppercase tracking-wider font-semibold',
	label: 'text-sm font-medium',
	paragraph: 'space-y-3 text-base text-slate-300',
	paragraghTitle:
		'text-xl font-bold text-amber-500 pb-2 border-b border-slate-800',
	quizLabel: 'block text-xs font-bold text-amber-400',
} as const

/**
 * Visual surface themes & color states.
 */
export const SURFACES = {
	// Default dark tile surface
	tileDefault: 'bg-slate-900 border-slate-800 text-slate-400',
	// Active/Player highlighted tile
	tileActive: 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 z-10',
	// Panel container dark background
	panelDark: 'bg-slate-950 border-slate-800',
} as const
