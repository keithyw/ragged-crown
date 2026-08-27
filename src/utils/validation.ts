export interface ValidationResult {
	isValid: boolean
	error?: string
}

export const validateCharacterName = (
	name: string,
	existingNames: string[] = [],
): ValidationResult => {
	const trimmed = name.trim()

	if (trimmed.length < 2) {
		return { isValid: false, error: 'Name must be at least 2 characters.' }
	}

	if (trimmed.length > 20) {
		return { isValid: false, error: 'Name cannot exceed 20 characters.' }
	}

	// Alphanumeric and spaces only
	const validCharRegex = /^[a-zA-Z0-9 ]+$/
	if (!validCharRegex.test(trimmed)) {
		return {
			isValid: false,
			error: 'Only letters, numbers, and spaces allowed.',
		}
	}

	// Check against existing player characters (case-insensitive)
	const isDuplicate = existingNames.some(
		(existing) => existing.toLowerCase() === trimmed.toLowerCase(),
	)
	if (isDuplicate) {
		return {
			isValid: false,
			error: 'A character with this name already exists.',
		}
	}

	return { isValid: true }
}
