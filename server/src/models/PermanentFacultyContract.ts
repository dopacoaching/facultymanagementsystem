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

  // BASE_OVERTIME (Fahim BM) / BASE_OVERTIME_PENALTY (Jidhu)
  overtimeThresholdHours?: number
  overtimeRatePerHour?: number

  // SPLIT_FIXED_VARIABLE (Dr. Dunoonul Shibli, Anoop K)
  fixedComponent?: number
  variableComponent?: number
  // Also used by BASE_OVERTIME_PENALTY (Jidhu), where it applies against
  // fixedMonthlySalary instead of variableComponent — see calculator.ts.
  cancellationPenaltyPerClass?: number
  minHoursRequirement?: number   // combined min-hours gate alongside minDaysNormal

  // BASE_OVERTIME_SHORTFALL (Promod): below overtimeThresholdHours, pay is
  // hoursLogged × shortfallRatePerHour instead of fixedMonthlySalary + overtime.
  shortfallRatePerHour?: number

  // DOUBT_CLEARANCE_SPLIT_RATE (Parvathy, Thamanna, Manju): fixedMonthlySalary is
  // the flat pay for up to overtimeThresholdHours of DOUBT_CLEARANCE-category
  // hours; overtimeRatePerHour pays extra doubt hours beyond that; classRatePerHour
  // pays every CLASS-category hour (no threshold, straight hourly).
  classRatePerHour?: number

  // CONFIGURABLE — pay structure configured by HR per faculty
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
        'BASE_OVERTIME_SHORTFALL',
        'DOUBT_CLEARANCE_SPLIT_RATE',
        'BASE_OVERTIME_PENALTY',
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
    shortfallRatePerHour:     Number,
    classRatePerHour:         Number,
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
