import { Schema, model, models, Model, Document } from 'mongoose'
import { FacultyType, SalaryModel } from '@/lib/types'

export interface IFaculty extends Document {
  name: string
  subject: string
  type: FacultyType
  salaryModel: SalaryModel
  isActive: boolean
  hourlyRate?: number
  fixedMonthlySalary?: number
  monthlyHourQuota?: number
  monthlyDayQuota?: number
  overtimeThreshold?: number
  overtimeRate?: number
  fixedComponent?: number
  variableComponent?: number
  totalContractDays?: number
  monthlyLeaveAllowance?: number
  aprilLeaveAllowance?: number
  minDaysNormal?: number
  minDaysDryMonth?: number
  configurablePayJson?: Record<string, unknown>
}

const FacultySchema = new Schema<IFaculty>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    type: { type: String, enum: ['PERMANENT', 'TEMPORARY', 'REGULAR', 'VISITING', 'CONTRACTUAL'], required: true },
    salaryModel: {
      type: String,
      enum: ['FIXED_MONTHLY', 'HOURLY', 'FIXED_WITH_QUOTA', 'SPLIT_FIXED_VARIABLE', 'CONFIGURABLE'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    hourlyRate: Number,
    fixedMonthlySalary: Number,
    monthlyHourQuota: Number,
    monthlyDayQuota: Number,
    overtimeThreshold: Number,
    overtimeRate: Number,
    fixedComponent: Number,
    variableComponent: Number,
    totalContractDays: Number,
    monthlyLeaveAllowance: Number,
    aprilLeaveAllowance: Number,
    minDaysNormal: Number,
    minDaysDryMonth: Number,
    configurablePayJson: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

FacultySchema.index({ name: 1 })
FacultySchema.index({ isActive: 1, name: 1 })

export const Faculty = (models.Faculty as Model<IFaculty>) ?? model<IFaculty>('Faculty', FacultySchema)
