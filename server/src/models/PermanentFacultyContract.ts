import { Schema, model, Document, Types } from 'mongoose'
import type { ContractType } from '../types'

// Re-export so callers that already import from this file don't need to change.
export type { ContractType }

export interface IPermanentFacultyContract extends Document {
  facultyId: Types.ObjectId
  contractType: ContractType

  // HOURLY / HOURLY_MIN_DAYS / BASE_OVERTIME
  hourlyRate?: number

  // FIXED_MONTHLY_* / FIXED_QUOTA_* / BASE_OVERTIME / SPLIT_FIXED_VARIABLE
  fixedMonthlySalary?: number

  // FIXED_QUOTA_CARRYFORWARD / FIXED_QUOTA_NOCARRY / BASE_OVERTIME
  monthlyHourQuota?: number

  // FIXED_QUOTA_CARRYFORWARD: writes deficit to DB; FIXED_QUOTA_NOCARRY: display only
  hasCarryForward: boolean

  // FIXED_MONTHLY_MIN_DAYS / HOURLY_MIN_DAYS / SPLIT_FIXED_VARIABLE
  minDaysNormal?: number

  // HOURLY_MIN_DAYS (Muneeb Haneefa C — lower threshold in dry months)
  minDaysDryMonths?: number
  dryMonths?: number[]   // month numbers e.g. [2, 3, 5]

  // FIXED_MONTHLY_LEAVE (Muhammed Ashique EK)
  monthlyLeaveAllowance?: number
  aprilLeaveAllowance?: number

  // BASE_OVERTIME (Fahim BM)
  overtimeThresholdHours?: number
  overtimeRatePerHour?: number

  // SPLIT_FIXED_VARIABLE (Dr. Dunoonul Shibli)
  fixedComponent?: number
  variableComponent?: number
  cancellationPenaltyPerClass?: number
  minHoursRequirement?: number   // combined min-hours gate alongside minDaysNormal

  // CONFIGURABLE (Dileep — TBD)
  isConfigured: boolean
  configurablePayJson?: Record<string, unknown>

  notes?: string
}

const PermanentFacultyContractSchema = new Schema<IPermanentFacultyContract>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true, unique: true },
    contractType: {
      type: String,
      enum: [
        'HOURLY',
        'FIXED_MONTHLY_MIN_DAYS',
        'FIXED_MONTHLY_LEAVE',
        'HOURLY_MIN_DAYS',
        'FIXED_QUOTA_CARRYFORWARD',
        'FIXED_QUOTA_NOCARRY',
        'BASE_OVERTIME',
        'SPLIT_FIXED_VARIABLE',
        'CONFIGURABLE',
      ],
      required: true,
    },
    hourlyRate:               Number,
    fixedMonthlySalary:       Number,
    monthlyHourQuota:         Number,
    hasCarryForward:          { type: Boolean, default: false },
    minDaysNormal:            Number,
    minDaysDryMonths:         Number,
    dryMonths:                [Number],
    monthlyLeaveAllowance:    Number,
    aprilLeaveAllowance:      Number,
    overtimeThresholdHours:   Number,
    overtimeRatePerHour:      Number,
    fixedComponent:           Number,
    variableComponent:        Number,
    cancellationPenaltyPerClass: Number,
    minHoursRequirement:      Number,
    // IMPORTANT: defaults to false — must be explicitly set to true via PATCH /hr/contract/:facultyId
    // after the HR Manager fills in the configurablePayJson and any other required fields.
    // The salary calculator returns PENDING_CONFIG until isConfigured === true.
    isConfigured:             { type: Boolean, default: false },
    configurablePayJson:      { type: Schema.Types.Mixed },
    notes:                    String,
  },
  { timestamps: true }
)

export const PermanentFacultyContract = model<IPermanentFacultyContract>(
  'PermanentFacultyContract',
  PermanentFacultyContractSchema
)
