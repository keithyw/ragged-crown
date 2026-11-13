import { create } from 'zustand'
import type { ItemDef, TileDef } from '@shared/types'
import { contentSource, type StoredDoc } from '@/services/ContentSource'
import type { EntityDef } from '@/utils/content'

type ById<T> = Map<string, StoredDoc<T>>

interface ContentStore {
	tiles: ById<TileDef>
	items: ById<ItemDef>
	/** Objects, creatures and portals share the `entities` collection. */
	entities: ById<EntityDef>
	isLoaded: boolean
	loadDefs: () => Promise<void>
}

const byId = <T>(docs: StoredDoc<T>[]): ById<T> =>
	new Map(docs.map((d) => [d._id, d]))

export const useContentStore = create<ContentStore>((set) => ({
	tiles: new Map(),
	items: new Map(),
	entities: new Map(),
	isLoaded: false,
	loadDefs: async () => {
		const [tiles, items, entities] = await Promise.all([
			contentSource.getAll<TileDef>('tile_defs'),
			contentSource.getAll<ItemDef>('items'),
			contentSource.getAll<EntityDef>('entities'),
		])
		set({
			tiles: byId(tiles),
			items: byId(items),
			entities: byId(entities),
			isLoaded: true,
		})
	},
}))
