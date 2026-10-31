'use client'
import { JointHistory } from '@/components/joint/JointHistory'
import { update } from '@/services/ig-session.service'

export default function IGJointHistoryPage() {
  return <JointHistory endpoint="/ig/joint-sessions/history" subject="the IG schools" save={update} />
}
