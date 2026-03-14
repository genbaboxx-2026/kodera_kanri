'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Minus, Plus, X } from 'lucide-react'

interface PartnerOvertimeProps {
  name: string
  headcount: number
  overtimeHeadcount?: number
  overtimeHours?: number
  onHeadcountChange?: (count: number) => void
  onOvertimeHeadcountChange?: (count: number) => void
  onOvertimeHoursChange?: (hours: number) => void
  onRemove?: () => void
}

export function PartnerOvertime({
  name,
  headcount,
  overtimeHeadcount = 0,
  overtimeHours = 0,
  onHeadcountChange,
  onOvertimeHeadcountChange,
  onOvertimeHoursChange,
  onRemove,
}: PartnerOvertimeProps) {
  return (
    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
      {/* 1行目: 会社名と人数 */}
      <div className="flex items-center justify-between">
        <span className="font-medium">{name}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onHeadcountChange?.(Math.max(1, headcount - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center">{headcount}名</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onHeadcountChange?.(headcount + 1)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* 2行目: 残業情報 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">残業:</span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOvertimeHeadcountChange?.(Math.max(0, overtimeHeadcount - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center">{overtimeHeadcount}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => onOvertimeHeadcountChange?.(Math.min(headcount, overtimeHeadcount + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span>名</span>
        </div>
        {overtimeHeadcount > 0 && (
          <>
            <span className="mx-2 text-gray-300">|</span>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={overtimeHours}
              onChange={(e) => onOvertimeHoursChange?.(parseFloat(e.target.value) || 0)}
              className="h-6 w-16 text-center"
            />
            <span>h</span>
          </>
        )}
      </div>
    </div>
  )
}
