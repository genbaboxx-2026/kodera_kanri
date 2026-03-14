'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: '未提出' | 'ピンク' | '確定'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    未提出: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    ピンク: 'bg-pink-100 text-pink-800 hover:bg-pink-100',
    確定: 'bg-white text-gray-800 border hover:bg-white',
  }

  return (
    <Badge variant="secondary" className={cn(styles[status])}>
      {status}
    </Badge>
  )
}
