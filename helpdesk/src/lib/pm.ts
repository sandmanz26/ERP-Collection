import { addDays } from 'date-fns'
import type { PmFrequency } from '@/data/types'

export const FREQ_DAYS: Record<PmFrequency, number> = { daily: 1, weekly: 7, monthly: 30, quarterly: 91, semiannual: 182, annual: 365 }
export const nextDue = (from: Date, f: PmFrequency) => addDays(from, FREQ_DAYS[f])
