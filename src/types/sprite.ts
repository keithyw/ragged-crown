// The part of a stored sprite (tools: `lib/types/sprite.ts`) the game draws.
// Tools-only fields (name, category, review status) are ignored.

/** Row-major, 16 * 16 entries: a palette index, or null for an empty cell. */
export type SpritePixels = (number | null)[]

export interface Sprite {
	pixels: SpritePixels
	/** A palette index, or 'transparent'. */
	background: number | 'transparent'
}
