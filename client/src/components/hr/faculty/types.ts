import type { Faculty } from '@/types'

export const SALARY_MODELS = ['HOURLY', 'FIXED_MONTHLY', 'FIXED_WITH_QUOTA', 'SPLIT_FIXED_VARIABLE', 'CONFIGURABLE']
export const TYPES = ['PERMANENT', 'TEMPORARY', 'REGULAR', 'VISITING', 'CONTRACTUAL']

export const EMPTY_FACULTY: Omit<Faculty, '_id'> = {
  name: '', subject: '', type: 'PERMANENT', salaryModel: 'HOURLY', isActive: true,
}
