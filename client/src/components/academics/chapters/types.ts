export interface ChapterRow {
  _id: string
  syllabusChapterId: string | null
  batchId: string
  subject: string
  chapterName: string
  chapterOrder: number
  scheduledMonth: number | null
  totalVideos: number | null
  videoReshooting: boolean
  videosWatched: number
  videoComplete: boolean
  videoCompletedAt: string | null
  facultyClassDone: boolean
  facultyClassDoneAt: string | null
  isStub: boolean
}

export const MONTH = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
