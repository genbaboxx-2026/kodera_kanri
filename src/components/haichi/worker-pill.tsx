'use client'

import { X, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkerPillProps {
  name: string
  shift: '日勤' | '夜勤'
  onRemove?: () => void
  onClick?: () => void
}

export function WorkerPill({ name, shift, onRemove, onClick }: WorkerPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm bg-gray-100',
        onClick && 'cursor-pointer hover:bg-gray-200'
      )}
      onClick={onClick}
    >
      {shift === '夜勤' && <Moon className="h-3 w-3 text-blue-600" />}
      <span>{name}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-gray-200"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
