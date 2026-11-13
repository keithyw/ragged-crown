import { create } from 'zustand'
import type { ItemDef, TileDef } from '@shared/types'
import type { Sprite } from '@/types'
import { contentSource, type StoredDoc } from '@/services/ContentSource'
import type { EntityDef } from '@/utils/content'

type ById<T> = Map<string, StoredDoc<T>>

interface ContentStore {
	tiles: ById<TileDef>
	items: ById<ItemDef>
	sprites: ById<Sprite>
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
	sprites: new Map(),
	entities: new Map(),
	isLoaded: false,
	loadDefs: async () => {
		const [tiles, items, entities, sprites] = await Promise.all([
			contentSource.getAll<TileDef>('tile_defs'),
			contentSource.getAll<ItemDef>('items'),
			contentSource.getAll<EntityDef>('entities'),
			contentSource.getAll<Sprite>('sprites'),
		])
		set({
			tiles: byId(tiles),
			items: byId(items),
			sprites: byId(sprites),
			entities: byId(entities),
			isLoaded: true,
		})
	},
}))
