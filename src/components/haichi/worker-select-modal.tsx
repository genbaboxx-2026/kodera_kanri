'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>

interface WorkerSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workers: Worker[]
  assignedWorkerIds: Set<number>
  onSelect: (workerId: number, shift: '日勤' | '夜勤') => void
}

export function WorkerSelectModal({
  open,
  onOpenChange,
  workers,
  assignedWorkerIds,
  onSelect,
}: WorkerSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedShift, setSelectedShift] = useState<'日勤' | '夜勤'>('日勤')

  const filteredWorkers = workers.filter((worker) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        worker.name.toLowerCase().includes(query) ||
        worker.name_kana.toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleSelect = (workerId: number) => {
    onSelect(workerId, selectedShift)
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>作業員を追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="名前で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* シフト選択 */}
          <div className="flex gap-2">
            <Button
              variant={selectedShift === '日勤' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedShift('日勤')}
              className="flex-1"
            >
              <Sun className="mr-1 h-4 w-4" />
              日勤
            </Button>
            <Button
              variant={selectedShift === '夜勤' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedShift('夜勤')}
              className="flex-1"
            >
              <Moon className="mr-1 h-4 w-4" />
              夜勤
            </Button>
          </div>

          {/* 作業員リスト */}
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {filteredWorkers.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                作業員が見つかりません
              </p>
            ) : (
              filteredWorkers.map((worker) => {
                const isAssigned = assignedWorkerIds.has(worker.id)
                return (
                  <button
                    key={worker.id}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left transition-colors',
                      isAssigned
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                        : 'hover:bg-blue-50'
                    )}
                    onClick={() => !isAssigned && handleSelect(worker.id)}
                    disabled={isAssigned}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{worker.name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          {worker.department}
                        </span>
                      </div>
                      {isAssigned && (
                        <Badge variant="secondary" className="text-xs">
                          配置済み
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
