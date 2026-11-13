// Copied from the tools (`lib/types/sprite.ts`): sprites aren't in the shared
// types, which are types only. Keep the palette in step with the tools.
export const SPRITE_SIZE = 16

export const EGA_PALETTE = [
	'#000000', // Black
	'#0000AA', // Blue
	'#00AA00', // Green
	'#00AAAA', // Cyan
	'#AA0000', // Red
	'#AA00AA', // Magenta
	'#AA5500', // Brown
	'#AAAAAA', // Light gray
	'#555555', // Dark gray
	'#5555FF', // Light blue
	'#55FF55', // Light green
	'#55FFFF', // Light cyan
	'#FF5555', // Light red
	'#FF55FF', // Light magenta
	'#FFFF55', // Yellow
	'#FFFFFF', // White
] as const
