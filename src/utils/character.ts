export const generateCharacterId = () => {
	return `char-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}
