'use client'
import { JointHistory } from '@/components/joint/JointHistory'

export default function IGJointHistoryPage() {
  return <JointHistory endpoint="/ig/joint-sessions/history" subject="the IG schools" />
}
