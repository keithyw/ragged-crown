export interface CommandHelp {
	keys: string
	label: string
}

/** The keys that work while exploring, for the command list on the map screen. */
export const WORLD_COMMANDS: CommandHelp[] = [
	{ keys: '↑ ↓ ← →  /  W A S D', label: 'Move' },
	{ keys: 'E', label: 'Enter (stand on a door, stairs or other portal)' },
	{ keys: 'Bump', label: 'Walk into a person or object to interact' },
	{ keys: 'O', label: 'Open (a chest or other object, then a direction)' },
	{ keys: 'G', label: 'Get (pick up an item, then a direction)' },
	{ keys: 'T', label: 'Talk (to a person or object, then a direction)' },
	{ keys: 'C', label: 'Character sheet' },
]
