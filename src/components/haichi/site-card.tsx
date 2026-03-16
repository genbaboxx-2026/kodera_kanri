'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { WorkerPill } from './worker-pill'
import { PartnerCounter } from './partner-counter'
import { Plus, Moon, Trash2, MoreVertical, ChevronDown, Crown, X } from 'lucide-react'
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

interface ForemanInfo {
  id: number
  workerId: number
  name: string
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
  const foreman = workers.find(w => w.isForeman)
  // 職長は作業員リストから除外
  const regularWorkers = workers.filter(w => !w.isForeman)
  const totalCount = workers.length + partners.reduce((sum, p) => sum + p.headcount, 0)
  const hasNightShift = shiftType !== '日勤のみ' || workers.some(w => w.shift === '夜勤')
  const nightWorkerCount = workers.filter(w => w.shift === '夜勤').length

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate">{siteName}</h3>
            <p className="text-sm text-gray-500 truncate">{clientCompany}</p>
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
        {/* 職長セクション */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">職長</h4>
          {foreman ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm text-amber-800">
              <Crown className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{foreman.name}</span>
              {!isReadOnly && (
                <button
                  onClick={onChangeForeman}
                  className="ml-1 text-amber-600 hover:text-amber-800"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            !isReadOnly ? (
              <button
                className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
                onClick={onChangeForeman}
              >
                <Plus className="h-3 w-3" />
                職長を設定
              </button>
            ) : (
              <span className="text-sm text-gray-400">未設定</span>
            )
          )}
        </div>

        {/* 作業員セクション */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">作業員（{regularWorkers.length}名）</h4>
          <div className="flex flex-wrap gap-2">
            {regularWorkers.map((worker) => (
              <WorkerPill
                key={worker.id}
                name={worker.name}
                shift={worker.shift}
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
        </div>

        {/* 協力会社セクション */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            協力会社{partners.length > 0 && `（${partners.length}社 / ${partners.reduce((sum, p) => sum + p.headcount, 0)}名）`}
          </h4>
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
              className="text-gray-500 mt-2"
              onClick={onAddPartner}
            >
              <Plus className="mr-1 h-3 w-3" />
              協力会社を追加
            </Button>
          )}
        </div>

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
