import type { ActiveMonster } from '@/types'

export const areMonstersAlive = (monsters: ActiveMonster[]): boolean => {
	return monsters.filter((m) => m.hp.current > 0).length > 0
}

export const calculateHPPercent = (
	hpCurrent: number,
	hpMax: number,
): number => {
	return Math.max(0, Math.min(hpCurrent / hpMax) * 100)
}
