import { DISABLING_STATUSES } from '@/constants'
import type { ResourceBar, Status } from '@/types'

/** What a status helper reads. `statuses` is optional so older saves still work. */
type Statused = { hp: ResourceBar; statuses?: Status[] }

/**
 * A character's or monster's statuses ([Combat 21]). Zero hit points means
 * dead, whether or not the mark was added, so older saves read right.
 */
export const statusesOf = (holder: Statused): Status[] => {
	const own = holder.statuses ?? []
	return holder.hp.current <= 0 && !own.includes('dead')
		? [...own, 'dead']
		: own
}

/** True when the holder takes no turn and can't be targeted: any disabling status. */
export const isDown = (holder: Statused): boolean =>
	statusesOf(holder).some((s) => DISABLING_STATUSES.includes(s))

/** The list with a status added once. */
export const withStatus = (statuses: Status[], status: Status): Status[] =>
	statuses.includes(status) ? statuses : [...statuses, status]
