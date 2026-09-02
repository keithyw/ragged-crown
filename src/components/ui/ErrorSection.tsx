import { TEXT } from '@/constants'
import { cn } from '@/utils'

interface ErrorSectionProps {
	error?: string
}

export const ErrorSection = ({ error }: ErrorSectionProps) => {
	if (!error) return null
	return
	;<p className={cn(TEXT.error)}>{error}</p>
}
