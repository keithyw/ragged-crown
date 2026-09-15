import type {
	ActionPayload,
	CommandResult,
	MoveResult,
	PipelineContext,
	Position,
	TileDef,
	TileObjectTypes,
	Zone,
} from '@/types'
import { CommandFactory } from '@/engine/commands/CommandFactory'

export class InteractionEngine {
	private getTileAt(
		pos: Position,
		tileObject: TileObjectTypes,
		zone: Zone,
	): TileDef | null {
		if (!this.isWithinBounds(pos, zone)) return null

		const row = zone.terrain[pos.y]
		if (!row) return null
		return tileObject[row[pos.x]] || null
	}

	private isWithinBounds(pos: Position, zone: Zone): boolean {
		const { width, height } = zone.dimensions || { width: 0, height: 0 }
		return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height
	}

	// moving functionality from utils
	public evaluateMove(
		currentPos: Position,
		dx: number,
		dy: number,
		tileObjects: TileObjectTypes,
		zone: Zone,
	): MoveResult {
		const nextPos = { x: currentPos.x + dx, y: currentPos.y + dy }
		if (!this.isWithinBounds(nextPos, zone)) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'The edge of the area blocks your path.',
			}
		}

		const targetTile = this.getTileAt(nextPos, tileObjects, zone)
		if (!targetTile) {
			return {
				canMove: false,
				nextPos: currentPos,
				blockReason: 'An impenetrable barrier blocks your way.',
			}
		}

		// how to handle interactive tile (events)
		// might have to cross examine position
		// with an event spot
		if (!targetTile.isWalkable) {
			return {
				canMove: false,
				nextPos: currentPos,
				targetTile,
				blockReason: `${targetTile.name} blocks your path!`,
			}
		}

		return {
			canMove: true,
			nextPos,
			targetTile,
		}
	}

	public getTileEvents(x: number, y: number, zone: Zone): ActionPayload[] {
		return zone.tileEvents?.[y + ',' + x] || []
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
