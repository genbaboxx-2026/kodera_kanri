'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface OvertimeRowProps {
  name: string
  startTime: string
  endTime: string
  onStartTimeChange?: (time: string) => void
  onEndTimeChange?: (time: string) => void
  onRemove?: () => void
}

export function OvertimeRow({
  name,
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  onRemove,
}: OvertimeRowProps) {
  // 残業時間を計算（0.5時間単位）
  const calculateOvertimeHours = () => {
    const start = parseTime(startTime)
    const end = parseTime(endTime)
    if (start === null || end === null) return 0
    const diff = (end - start) / 60 // 分単位を時間に変換
    return Math.round(diff * 2) / 2 // 0.5時間単位で丸め
  }

  const parseTime = (time: string): number | null => {
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return null
    return hours * 60 + minutes
  }

  const overtimeHours = calculateOvertimeHours()

  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
      <span className="min-w-16 text-sm font-medium">{name}</span>
      <Input
        type="time"
        value={startTime}
        onChange={(e) => onStartTimeChange?.(e.target.value)}
        className="w-24"
      />
      <span className="text-gray-400">〜</span>
      <Input
        type="time"
        value={endTime}
        onChange={(e) => onEndTimeChange?.(e.target.value)}
        className="w-24"
      />
      <span className="text-sm text-gray-600">({overtimeHours}h)</span>
      {onRemove && (
        <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={onRemove}>
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
