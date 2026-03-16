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

interface GroupedWorker {
  workerId: number
  workerName: string
  siteNames: string[]
  allConfirmed: boolean
  confirmedAt: string | null
  sentAt: string | null
}

export function ConfirmationStatus({ assignments, isPublished }: ConfirmationStatusProps) {
  // LINE送信時刻を取得（最初のpublished_at）
  const publishedAt = assignments.find(a => a.published_at)?.published_at || null

  // 作業員ごとにグループ化
  const workerMap = new Map<number, GroupedWorker>()

  for (const assignment of assignments) {
    const siteName = assignment.site?.name || '不明'
    for (const aw of assignment.workers || []) {
      if (!aw.worker) continue

      const existing = workerMap.get(aw.worker_id)
      if (existing) {
        existing.siteNames.push(siteName)
        // 1つでも未確認があれば未確認
        if (!aw.confirmed) {
          existing.allConfirmed = false
        }
        // 最新の確認日時を使用
        if (aw.confirmed_at && (!existing.confirmedAt || aw.confirmed_at > existing.confirmedAt)) {
          existing.confirmedAt = aw.confirmed_at
        }
      } else {
        workerMap.set(aw.worker_id, {
          workerId: aw.worker_id,
          workerName: aw.worker.name,
          siteNames: [siteName],
          allConfirmed: aw.confirmed,
          confirmedAt: aw.confirmed_at,
          sentAt: publishedAt,
        })
      }
    }
  }

  const allWorkers = Array.from(workerMap.values())
  const confirmedWorkers = allWorkers.filter(w => w.allConfirmed)
  const unconfirmedWorkers = allWorkers.filter(w => !w.allConfirmed)

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

  // 現場名を結合する関数
  const formatSiteNames = (siteNames: string[]) => {
    if (siteNames.length === 1) return siteNames[0]
    return siteNames.join('、')
  }

  return (
    <div className="space-y-6 p-4">
      {/* LINE送信時刻 */}
      {publishedAt && (
        <div className="text-center text-sm text-gray-500">
          LINE送信: {format(new Date(publishedAt), 'M/d HH:mm', { locale: ja })}
        </div>
      )}

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
                key={w.workerId}
                className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium">{w.workerName}</div>
                  {w.sentAt && (
                    <div className="text-right text-xs text-gray-400">
                      <div>送信</div>
                      <div>{format(new Date(w.sentAt), 'M/d HH:mm', { locale: ja })}</div>
                    </div>
                  )}
                </div>
                <div className="flex items-end justify-between mt-1">
                  <div className="text-sm text-gray-600">{formatSiteNames(w.siteNames)}</div>
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    未確認
                  </Badge>
                </div>
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
                key={w.workerId}
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
              >
                <div className="flex items-start justify-between">
                  <div className="font-medium">{w.workerName}</div>
                  <div className="text-right text-xs text-gray-400">
                    {w.sentAt && (
                      <>
                        <div>送信: {format(new Date(w.sentAt), 'M/d HH:mm', { locale: ja })}</div>
                      </>
                    )}
                    {w.confirmedAt && (
                      <div className="text-green-600">確認: {format(new Date(w.confirmedAt), 'M/d HH:mm', { locale: ja })}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <div className="text-sm text-gray-600">{formatSiteNames(w.siteNames)}</div>
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    確認済み
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
