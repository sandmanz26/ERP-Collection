import { addDays } from 'date-fns'
import type { PmFrequency } from '@/data/types'

export const FREQ_DAYS: Record<PmFrequency, number> = { weekly: 7, monthly: 30, quarterly: 91, semiannual: 182, annual: 365 }
export const FREQ_LABEL: Record<PmFrequency, string> = { weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Every 6 months', annual: 'Annual' }
export const nextDue = (from: Date, f: PmFrequency) => addDays(from, FREQ_DAYS[f])
