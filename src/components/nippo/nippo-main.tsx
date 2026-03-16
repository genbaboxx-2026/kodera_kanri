'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NippoSiteList } from './nippo-site-list'
import { NippoContainer } from './nippo-container'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

interface NippoMainProps {
  userId: string
  workerId: number | null
  initialAssignmentId?: number
  initialDate: string
}

export function NippoMain({ userId, workerId, initialAssignmentId, initialDate }: NippoMainProps) {
  const router = useRouter()
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(initialAssignmentId || null)

  // worker_idがない場合はエラー表示
  if (!workerId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 text-lg">アカウントに作業員が紐付いていません</p>
        <p className="text-gray-400 text-sm mt-2">管理者に連絡してください</p>
      </div>
    )
  }

  // 現場が選択されている場合は日報入力画面を表示
  if (selectedAssignmentId) {
    return (
      <div className="flex flex-col">
        {/* 戻るヘッダー */}
        <div className="sticky top-0 z-10 flex items-center border-b bg-white px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAssignmentId(null)}
            className="text-gray-600"
          >
            <ChevronLeft className="h-5 w-5 mr-1" />
            戻る
          </Button>
          <h1 className="flex-1 text-center text-lg font-bold pr-16">日報入力</h1>
        </div>

        <NippoContainer
          userId={userId}
          workerId={workerId}
          assignmentId={selectedAssignmentId}
          targetDate={initialDate}
        />
      </div>
    )
  }

  // 現場一覧を表示
  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-center border-b bg-white px-4 py-3">
        <h1 className="text-lg font-bold">日報</h1>
      </div>

      <NippoSiteList
        workerId={workerId}
        onSelectSite={(assignmentId) => setSelectedAssignmentId(assignmentId)}
      />
    </div>
  )
}
