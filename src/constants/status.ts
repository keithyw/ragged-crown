import type { Status } from '@/types'

/** Full names, for the character sheet. */
export const STATUS_LABEL: Record<Status, string> = {
	dead: 'Dead',
	asleep: 'Asleep',
	unconscious: 'Unconscious',
}

/** Short forms, for the party roster and the monster rows, where room is tight. */
export const STATUS_ABBR: Record<Status, string> = {
	dead: 'DEAD',
	asleep: 'SLP',
	unconscious: 'UNC',
}

/** A holder of any of these takes no turn ([Combat 21]). */
export const DISABLING_STATUSES: readonly Status[] = [
	'dead',
	'asleep',
	'unconscious',
]
