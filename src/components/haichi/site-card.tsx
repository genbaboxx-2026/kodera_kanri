'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { WorkerPill } from './worker-pill'
import { PartnerCounter } from './partner-counter'
import { Plus, Moon, Trash2, MoreVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Worker {
  id: number
  workerId: number
  name: string
  shift: '日勤' | '夜勤'
  isForeman: boolean
}

interface Partner {
  id: number
  partnerCompanyId: number
  name: string
  headcount: number
}

interface SiteCardProps {
  assignmentId: number
  siteName: string
  clientCompany: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  workers: Worker[]
  partners: Partner[]
  isReadOnly?: boolean
  onAddWorker?: () => void
  onRemoveWorker?: (assignmentWorkerId: number) => void
  onAddPartner?: () => void
  onUpdatePartnerCount?: (partnerRecordId: number, count: number) => void
  onDelete?: () => void
  onChangeForeman?: () => void
}

export function SiteCard({
  siteName,
  clientCompany,
  contractType,
  shiftType,
  workers,
  partners,
  isReadOnly = false,
  onAddWorker,
  onRemoveWorker,
  onAddPartner,
  onUpdatePartnerCount,
  onDelete,
  onChangeForeman,
}: SiteCardProps) {
  const totalCount = workers.length + partners.reduce((sum, p) => sum + p.headcount, 0)
  const hasNightShift = shiftType !== '日勤のみ' || workers.some(w => w.shift === '夜勤')
  const nightWorkerCount = workers.filter(w => w.shift === '夜勤').length
  const foreman = workers.find(w => w.isForeman)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{siteName}</h3>
            <p className="text-sm text-gray-500 truncate">{clientCompany}</p>
            {foreman ? (
              <button
                className="mt-1 text-sm text-amber-700 hover:text-amber-800 flex items-center gap-1"
                onClick={!isReadOnly ? onChangeForeman : undefined}
                disabled={isReadOnly}
              >
                職長: {foreman.name}
              </button>
            ) : (
              !isReadOnly && (
                <button
                  className="mt-1 text-sm text-gray-400 hover:text-gray-600"
                  onClick={onChangeForeman}
                >
                  + 職長を設定
                </button>
              )
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={contractType === '常用' ? 'default' : 'secondary'}>
              {contractType}
            </Badge>
            {!isReadOnly && onDelete && (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={onDelete}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    削除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 作業員ピル */}
        <div className="flex flex-wrap gap-2">
          {workers.map((worker) => (
            <WorkerPill
              key={worker.id}
              name={worker.name}
              shift={worker.shift}
              isForeman={worker.isForeman}
              onRemove={!isReadOnly ? () => onRemoveWorker?.(worker.id) : undefined}
            />
          ))}
          {!isReadOnly && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onAddWorker}
            >
              <Plus className="mr-1 h-3 w-3" />
              追加
            </Button>
          )}
        </div>

        {/* 協力会社 */}
        {partners.length > 0 && (
          <div className="space-y-2">
            {partners.map((partner) => (
              <PartnerCounter
                key={partner.id}
                name={partner.name}
                count={partner.headcount}
                onChange={
                  !isReadOnly
                    ? (count) => onUpdatePartnerCount?.(partner.id, count)
                    : undefined
                }
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500"
            onClick={onAddPartner}
          >
            <Plus className="mr-1 h-3 w-3" />
            協力会社を追加
          </Button>
        )}

        {/* フッター */}
        <div className="flex items-center justify-between border-t pt-2 text-sm">
          <span className="font-medium">計 {totalCount}名</span>
          <div className="flex items-center gap-2">
            {hasNightShift && (
              <Badge variant="outline" className="gap-1">
                <Moon className="h-3 w-3" />
                夜勤{nightWorkerCount > 0 && ` ${nightWorkerCount}名`}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
