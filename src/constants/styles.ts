/**
 * Atomic layout primitives & shapes.
 * Zero colors, zero sizing — purely layout geometry.
 */
export const SHAPES = {
	// A centered flex box for icons, grid items, and avatars
	centeredBox: 'flex items-center justify-center relative',
	// Aspect-ratio square container
	square: 'aspect-square flex items-center justify-center relative',
	// Panel container frame
	panel: 'flex flex-col h-full w-full overflow-hidden border',
} as const

/**
 * Text & typography scale.
 */
export const TEXT = {
	monoBadge: 'font-mono text-xs font-bold leading-none',
	panelHeader: 'text-xs uppercase tracking-wider font-semibold',
	label: 'text-sm font-medium',
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
