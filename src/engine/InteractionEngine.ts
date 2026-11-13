import type { CellKey, MoveResult, Placement, Zone } from '@shared/types'
import type {
	ActionPayload,
	CommandResult,
	PipelineContext,
	Position,
} from '@/types'
import { cellKey, lookupPlacementDef, type DefLookup } from '@/utils/content'
import { CommandFactory } from '@/engine/commands/CommandFactory'

export class InteractionEngine {
	private isWithinBounds(pos: Position, zone: Zone): boolean {
		const { width, height } = zone.dimensions || { width: 0, height: 0 }
		return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
	}

	/**
	 * A cell is blocked if its terrain is not walkable or any placement in its
	 * stack is solid (DATA-MODEL.md 1.4).
	 */
	public evaluateMove(
		currentPos: Position,
		dx: number,
		dy: number,
		zone: Zone,
		placements: Partial<Record<CellKey, Placement[]>>,
		defs: DefLookup,
	): MoveResult {
		const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy }
		if (!this.isWithinBounds(nextPos, zone)) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'The edge of the area blocks your path.',
			}
		}

		const targetTile = defs.tiles.get(zone.terrain[nextPos.y]?.[nextPos.x])
		if (!targetTile) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'An impenetrable barrier blocks your way.',
			}
		}

		// Unchanged from before: an unset isWalkable counts as blocked.
		if (!targetTile.isWalkable) {
			return {
				canMove: false,
				nextPos: currentPos,
				targetTile,
				blockReason: `${targetTile.name} blocks your path!`,
			}
		}

		for (const placement of placements[cellKey(nextPos.x, nextPos.y)] ?? []) {
			const def = lookupPlacementDef(defs, placement)
			if (def?.kind === 'object' && def.isSolid) {
				return {
					canMove: false,
					nextPos: currentPos,
					targetTile,
					blockReason: `${def.name} blocks your path!`,
				}
			}
		}

		return {
			canMove: true,
			nextPos,
			targetTile,
		}
	}

	// TODO [Game 2]: the old tileEvents path. The new zone model has no
	// `tileEvents` (interactions live on defs and placements), so this finds
	// nothing until the interaction engine replaces it.
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public getTileEvents(_x: number, _y: number, _zone: Zone): ActionPayload[] {
		return []
	}

	public hasTileEvents(x: number, y: number, zone: Zone): boolean {
		const events = this.getTileEvents(x, y, zone)
		return events.length > 0
	}

	public evaluateTile(x: number, y: number, zone: Zone) {
		if (!this.hasTileEvents(x, y, zone)) return
		const events = this.getTileEvents(x, y, zone)
		const ctx = {
			currentZoneId: zone.id,
			playerPos: { x, y },
			flags: {
				popTopTile: true,
				// ignore zone transition for now
			},
		}

		const result = this.handleEvents(events, ctx)
		if (result.success) {
			// TODO: handle result.data
		}
	}

	/**
	 * Executes a chain of command objects in sequence, piping results.
	 */
	public handleEvents(
		actions: ActionPayload[],
		initialContext: PipelineContext,
	): CommandResult {
		const ctx = { ...initialContext }

		for (const action of actions) {
			const command = CommandFactory.create(action)
			if (!command) continue

			// Execute command passing the accumulated context
			command.setContext(ctx)
			ctx.result = command.execute()

			// Stop chain execution if command signals halt (e.g. zone change)
			if (!ctx.result.success || ctx.result.stopPipeline) {
				break
			}

			// re-run the command
			if (!action.popOnComplete) {
				actions.push(action)
			}
		}

		return ctx?.result || { success: true }
	}

	public handleMove() {}
}

let instance: InteractionEngine | null = null
export const getInteractionEngine = (): InteractionEngine => {
	if (!instance) instance = new InteractionEngine()
	return instance
}
