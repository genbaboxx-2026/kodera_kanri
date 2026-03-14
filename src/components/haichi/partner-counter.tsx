'use client'

import { Button } from '@/components/ui/button'
import { Minus, Plus } from 'lucide-react'

interface PartnerCounterProps {
  name: string
  count: number
  onChange?: (count: number) => void
  isReadOnly?: boolean
}

export function PartnerCounter({
  name,
  count,
  onChange,
  isReadOnly = false,
}: PartnerCounterProps) {
  const handleDecrement = () => {
    onChange?.(count - 1)
  }

  const handleIncrement = () => {
    onChange?.(count + 1)
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
      <span className="text-sm font-medium">{name}</span>
      {isReadOnly ? (
        <span className="font-medium">{count}名</span>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleDecrement}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center font-medium">{count}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleIncrement}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
