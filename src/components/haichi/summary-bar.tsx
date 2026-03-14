'use client'

import { Badge } from '@/components/ui/badge'

interface SummaryBarProps {
  assignedCount: number
  unassignedCount: number
  confirmedCount: number
  unconfirmedCount: number
  isPublished: boolean
  publishedAt?: Date
}

export function SummaryBar({
  assignedCount,
  unassignedCount,
  confirmedCount,
  unconfirmedCount,
  isPublished,
  publishedAt,
}: SummaryBarProps) {
  return (
    <div className="border-b bg-white px-4 py-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>
          配置済み: <strong>{assignedCount}名</strong>
        </span>
        <span className={unassignedCount > 0 ? 'text-red-600' : ''}>
          未配置: <strong>{unassignedCount}名</strong>
        </span>
        {isPublished && (
          <>
            <span className="text-green-600">
              確認済み: <strong>{confirmedCount}名</strong>
            </span>
            <span className="text-orange-600">
              未確認: <strong>{unconfirmedCount}名</strong>
            </span>
          </>
        )}
        {isPublished && publishedAt && (
          <Badge variant="secondary" className="ml-auto">
            配信済み
          </Badge>
        )}
      </div>
    </div>
  )
}
