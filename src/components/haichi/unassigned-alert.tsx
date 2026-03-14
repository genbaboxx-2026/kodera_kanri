'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>

interface UnassignedAlertProps {
  workers: Worker[]
}

export function UnassignedAlert({ workers }: UnassignedAlertProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (workers.length === 0) return null

  return (
    <>
      <div className="bg-red-50 px-4 py-3 border-b border-red-100">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">
              未配置: {workers.length}名
            </p>
            <p className="text-sm text-red-600 mt-1 line-clamp-2">
              {workers.map(w => w.name).join('、')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-700 hover:text-red-800 hover:bg-red-100 shrink-0 text-xs"
            onClick={() => setIsModalOpen(true)}
          >
            詳細確認
          </Button>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              未配置: {workers.length}名
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {worker.name}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
