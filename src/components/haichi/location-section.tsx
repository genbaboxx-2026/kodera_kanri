'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, X, Search, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type LocationType = Tables<'location_types'>
type AssignmentLocation = Tables<'assignment_locations'> & {
  worker?: Worker
  location_type?: LocationType
}

interface LocationSectionProps {
  locationTypes: LocationType[]
  assignmentLocations: AssignmentLocation[]
  workers: Worker[]
  assignedWorkerIds: Set<number>
  isReadOnly: boolean
  onAddWorker: (locationTypeId: number, workerId: number) => void
  onRemoveWorker: (locationId: number) => void
}

export function LocationSection({
  locationTypes,
  assignmentLocations,
  workers,
  assignedWorkerIds,
  isReadOnly,
  onAddWorker,
  onRemoveWorker,
}: LocationSectionProps) {
  const [modalState, setModalState] = useState<{
    open: boolean
    locationTypeId: number | null
    locationTypeName: string
  }>({ open: false, locationTypeId: null, locationTypeName: '' })
  const [searchQuery, setSearchQuery] = useState('')

  const getWorkersForLocation = (locationTypeId: number) => {
    return assignmentLocations.filter(al => al.location_type_id === locationTypeId)
  }

  const handleOpenModal = (locationType: LocationType) => {
    setModalState({
      open: true,
      locationTypeId: locationType.id,
      locationTypeName: locationType.name,
    })
    setSearchQuery('')
  }

  const handleSelectWorker = (workerId: number) => {
    if (modalState.locationTypeId) {
      onAddWorker(modalState.locationTypeId, workerId)
    }
    setModalState({ open: false, locationTypeId: null, locationTypeName: '' })
    setSearchQuery('')
  }

  const availableWorkers = workers.filter(
    w => w.status === '在籍' && !assignedWorkerIds.has(w.id)
  )

  const filteredWorkers = availableWorkers.filter((worker) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        worker.name.toLowerCase().includes(query) ||
        worker.name_kana.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <>
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 font-medium text-gray-700">
          <MapPin className="h-4 w-4" />
          場所・その他
        </h3>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {locationTypes.map((locationType) => {
            const locationWorkers = getWorkersForLocation(locationType.id)
            return (
              <Card key={locationType.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50 py-2 px-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{locationType.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {locationWorkers.length}名
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {locationWorkers.map((loc) => (
                      <span
                        key={loc.id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-sm"
                      >
                        {loc.worker?.name}
                        {!isReadOnly && (
                          <button
                            onClick={() => onRemoveWorker(loc.id)}
                            className="ml-0.5 rounded-full p-0.5 hover:bg-gray-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                    {!isReadOnly && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleOpenModal(locationType)}
                      >
                        <Plus className="mr-0.5 h-3 w-3" />
                        追加
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* 作業員選択モーダル */}
      <Dialog
        open={modalState.open}
        onOpenChange={(open) =>
          setModalState({ ...modalState, open })
        }
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalState.locationTypeName}に追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="名前で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {filteredWorkers.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  {availableWorkers.length === 0
                    ? '配置可能な作業員がいません'
                    : '作業員が見つかりません'}
                </p>
              ) : (
                filteredWorkers.map((worker) => (
                  <button
                    key={worker.id}
                    className="w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50"
                    onClick={() => handleSelectWorker(worker.id)}
                  >
                    <span className="font-medium">{worker.name}</span>
                    <span className="ml-2 text-sm text-gray-500">
                      {worker.department}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
