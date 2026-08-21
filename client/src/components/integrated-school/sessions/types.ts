export interface ISBatchChapter {
  _id: string
  subject: string
  chapterName: string
  chapterOrder: number
  status: 'NOT_YET_SCHEDULED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
}
