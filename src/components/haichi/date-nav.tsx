'use client'

import { format, isToday, isTomorrow, isYesterday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DateNavProps {
  date: Date
  onPrevDay: () => void
  onNextDay: () => void
}

function getDateLabel(date: Date): string | null {
  if (isToday(date)) return '本日'
  if (isTomorrow(date)) return '明日'
  if (isYesterday(date)) return '昨日'
  return null
}

export function DateNav({ date, onPrevDay, onNextDay }: DateNavProps) {
  const label = getDateLabel(date)

  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-3">
      <Button variant="ghost" size="icon" onClick={onPrevDay}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold">
          {format(date, 'M月d日（E）', { locale: ja })}
        </span>
        {label && (
          <span className={`text-xs font-medium ${
            label === '本日' ? 'text-blue-600' :
            label === '明日' ? 'text-orange-600' :
            'text-gray-500'
          }`}>
            {label}
          </span>
        )}
      </div>
      <Button variant="ghost" size="icon" onClick={onNextDay}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
