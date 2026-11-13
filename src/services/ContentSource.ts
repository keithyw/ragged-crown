// How the game gets authored content ([Game 8]). Two methods, so the API can
// later be swapped for exported files of the same shape.

/** A stored document: the def or zone plus the server's `_id`. */
export type StoredDoc<T> = T & { _id: string }

export interface ContentSource {
	/** `filters` are string equality matches, e.g. `{ id: 'FARM_HOUSE' }`. */
	getAll<T>(
		collection: string,
		filters?: Record<string, string>,
	): Promise<StoredDoc<T>[]>
	get<T>(collection: string, _id: string): Promise<StoredDoc<T>>
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

class ApiContentSource implements ContentSource {
	async getAll<T>(
		collection: string,
		filters?: Record<string, string>,
	): Promise<StoredDoc<T>[]> {
		const query = filters ? `?${new URLSearchParams(filters)}` : ''
		return this.fetchJson(`/collection/${collection}${query}`)
	}

	async get<T>(collection: string, _id: string): Promise<StoredDoc<T>> {
		return this.fetchJson(`/collection/${collection}/${_id}`)
	}

	private async fetchJson<R>(path: string): Promise<R> {
		const res = await fetch(`${API_URL}${path}`)
		if (!res.ok) {
			throw new Error(`Content API ${path}: HTTP ${res.status}`)
		}
		return (await res.json()) as R
	}
}

export const contentSource: ContentSource = new ApiContentSource()
