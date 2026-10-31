'use client'
import { JointHistory } from '@/components/joint/JointHistory'
import { update } from '@/services/session.service'

export default function JointEntryHistoryPage() {
  return <JointHistory endpoint="/academics/joint-sessions/history" subject="the campuses" save={update} />
}
