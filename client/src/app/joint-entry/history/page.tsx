'use client'
import { JointHistory } from '@/components/joint/JointHistory'

export default function JointEntryHistoryPage() {
  return <JointHistory endpoint="/academics/joint-sessions/history" subject="the campuses" />
}
