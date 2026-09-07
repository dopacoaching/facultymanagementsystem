import { Schema, model, models, Model, Document, Types } from 'mongoose'
import { PayrollStatus } from '@/lib/types'

export interface ISalaryRecord extends Document {
  facultyId: Types.ObjectId
  month: number
  year: number
  /** MONTH = the standard calendar-month payroll run. RANGE = a from/to date
   *  window used for TEMPORARY faculty paid by the week. For RANGE records
   *  month/year are derived from periodStart so month-keyed views still bucket
   *  them. */
  periodType: 'MONTH' | 'RANGE'
  periodStart?: Date
  periodEnd?: Date
  hoursLogged: number
  daysWorked: number
  leavesTaken: number
  overtimeHours: number
  overtimePay: number
  baseSalary: number
  totalDeductions: number
  penaltiesApplied: number
  finalPayable: number
  tds: number
  netPayable: number
  monthBalance: number
  status: PayrollStatus
  approvedByUserId?: Types.ObjectId
  approvedAt?: Date
}

const SalaryRecordSchema = new Schema<ISalaryRecord>(
  {
    facultyId: { type: Schema.Types.ObjectId, ref: 'Faculty', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    periodType: { type: String, enum: ['MONTH', 'RANGE'], default: 'MONTH' },
    periodStart: Date,
    periodEnd: Date,
    hoursLogged: { type: Number, default: 0 },
    daysWorked: { type: Number, default: 0 },
    leavesTaken: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    baseSalary: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    penaltiesApplied: { type: Number, default: 0 },
    finalPayable: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    netPayable: { type: Number, default: 0 },
    monthBalance: { type: Number, default: 0 },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'BLOCKED'], default: 'PENDING' },
    approvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
  },
  { timestamps: true }
)

// One calendar-month payroll run per faculty. Partial so it does not constrain
// RANGE records (a temporary faculty can have several date-window records that
// derive the same month/year). The old plain-unique index on the same keys is
// NOT dropped automatically by Mongoose — run the migration once per database
// (prod AND any existing dev DB):
//   cd server && npm run migrate:salary-period
SalaryRecordSchema.index(
  { facultyId: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { periodType: 'MONTH' } },
)
SalaryRecordSchema.index({ month: 1, year: 1 })
SalaryRecordSchema.index({ facultyId: 1, periodStart: 1, periodEnd: 1 })

export const SalaryRecord = (models.SalaryRecord as Model<ISalaryRecord>) ?? model<ISalaryRecord>('SalaryRecord', SalaryRecordSchema)
