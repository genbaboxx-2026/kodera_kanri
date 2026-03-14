'use client'

import { useState } from 'react'
import { AttendanceList } from '@/components/attendance/attendance-list'
import { AttendanceDetail } from '@/components/attendance/attendance-detail'

export default function AttendancePage() {
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null)

  const handleWorkerClick = (workerId: number) => {
    setSelectedWorkerId(workerId)
  }

  const handleBack = () => {
    setSelectedWorkerId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">出勤表</h1>
      </div>
      {selectedWorkerId === null ? (
        <AttendanceList onWorkerClick={handleWorkerClick} />
      ) : (
        <AttendanceDetail workerId={selectedWorkerId} onBack={handleBack} />
      )}
    </div>
  )
}
