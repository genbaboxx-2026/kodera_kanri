'use client'

import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Check, Clock, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type Site = Tables<'sites'>
type AssignmentWorker = Tables<'assignment_workers'> & { worker?: Worker }
type Assignment = Tables<'assignments'> & {
  site?: Site
  workers?: AssignmentWorker[]
}

interface ConfirmationStatusProps {
  assignments: Assignment[]
  isPublished: boolean
}

export function ConfirmationStatus({ assignments, isPublished }: ConfirmationStatusProps) {
  // 全作業員をフラット化
  const allWorkers = assignments.flatMap(a =>
    (a.workers || []).map(w => ({
      ...w,
      siteName: a.site?.name || '不明',
      assignmentId: a.id,
    }))
  )

  const confirmedWorkers = allWorkers.filter(w => w.confirmed)
  const unconfirmedWorkers = allWorkers.filter(w => !w.confirmed)

  if (!isPublished) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <MessageCircle className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">まだLINE配信されていません</p>
        <p className="text-sm mt-2">LINE配信後に確認状況が表示されます</p>
      </div>
    )
  }

  if (allWorkers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <p>配置された作業員がいません</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* サマリー */}
      <div className="flex items-center justify-center gap-6 rounded-lg bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{confirmedWorkers.length}</div>
          <div className="text-sm text-gray-600">確認済み</div>
        </div>
        <div className="h-8 w-px bg-gray-300" />
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{unconfirmedWorkers.length}</div>
          <div className="text-sm text-gray-600">未確認</div>
        </div>
        <div className="h-8 w-px bg-gray-300" />
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-600">{allWorkers.length}</div>
          <div className="text-sm text-gray-600">合計</div>
        </div>
      </div>

      {/* 未確認リスト */}
      {unconfirmedWorkers.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-600 mb-3">
            <Clock className="h-4 w-4" />
            未確認 ({unconfirmedWorkers.length}名)
          </h3>
          <div className="space-y-2">
            {unconfirmedWorkers.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
              >
                <div>
                  <div className="font-medium">{w.worker?.name || '不明'}</div>
                  <div className="text-sm text-gray-600">{w.siteName}</div>
                </div>
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  未確認
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 確認済みリスト */}
      {confirmedWorkers.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-green-600 mb-3">
            <Check className="h-4 w-4" />
            確認済み ({confirmedWorkers.length}名)
          </h3>
          <div className="space-y-2">
            {confirmedWorkers.map((w) => (
              <div
                key={w.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-4 py-3",
                  "border-green-200 bg-green-50"
                )}
              >
                <div>
                  <div className="font-medium">{w.worker?.name || '不明'}</div>
                  <div className="text-sm text-gray-600">{w.siteName}</div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    確認済み
                  </Badge>
                  {w.confirmed_at && (
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(w.confirmed_at), 'M/d HH:mm', { locale: ja })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
