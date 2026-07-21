export interface ISession {
  _id:      string
  facultyId: { name: string } | string | null
  batchId:  string
  subject:  string
  sessionDate: string
  status:   string
}

export interface DailySlot {
  _id:      string
  batchId:  { _id: string; name: string } | string
  subject:  string
  chapter:  string
  timeSlot: 'MORNING' | 'AFTERNOON'
  status:   string
  facultyId?: { name: string } | string
}

export interface ISChapter {
  _id:     string
  subject: string
  status:  string
}

export const STATUS_BADGE: Record<string, string> = {
  COMPLETED:         'badge-green',
  CANCELLED:         'badge-red',
  SCHEDULED:         'badge-blue',
  NOT_COMPLETED:     'badge-yellow',
  PLANNED:           'badge-blue',
  NOT_YET_SCHEDULED: 'badge-gray',
}
