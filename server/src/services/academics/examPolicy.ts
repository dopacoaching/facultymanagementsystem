import { Types } from 'mongoose'
import { BatchChapter } from '../../models/BatchChapter'

export interface ExamTopicResult {
  topic: string
  isPending: boolean
  wasExcluded?: { chapterName: string; reason: string }
}

export async function suggestExamTopic(batchId: string, examDate: Date): Promise<ExamTopicResult> {
  const cutoff = new Date(examDate)
  cutoff.setDate(cutoff.getDate() - 1)
  cutoff.setHours(0, 0, 0, 0)

  const bId = new Types.ObjectId(batchId)

  const [completed, recentExcluded] = await Promise.all([
    BatchChapter.find({ batchId: bId, facultyClassDone: true, facultyClassDoneAt: { $lt: cutoff } })
      .sort({ facultyClassDoneAt: -1 }),
    BatchChapter.findOne({ batchId: bId, facultyClassDone: true, facultyClassDoneAt: { $gte: cutoff } }),
  ])

  if (completed.length === 0) return { topic: '[Topic Pending — Academics to confirm]', isPending: true }

  const bySubject: Record<string, string[]> = {}
  for (const ch of completed) {
    if (!bySubject[ch.subject]) bySubject[ch.subject] = []
    bySubject[ch.subject].push(ch.chapterName)
  }

  const subjects = Object.keys(bySubject)
  let topic: string

  if (subjects.length === 1 && bySubject[subjects[0]].length >= 2) {
    topic = `Exam: ${bySubject[subjects[0]].join(' + ')}`
  } else if (subjects.length >= 2) {
    topic = `Exam: ${subjects.map((s) => bySubject[s][0]).join(' + ')}`
  } else {
    topic = `Exam: ${completed[0].chapterName}`
  }

  const result: ExamTopicResult = { topic, isPending: false }
  if (recentExcluded) {
    result.wasExcluded = {
      chapterName: recentExcluded.chapterName,
      reason: `Completed on ${recentExcluded.facultyClassDoneAt?.toDateString()} — excluded by 1-Day Buffer Rule`,
    }
  }
  return result
}
