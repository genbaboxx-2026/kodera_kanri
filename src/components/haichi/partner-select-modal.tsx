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
import { Label } from '@/components/ui/label'
import { Search, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type PartnerCompany = Tables<'partner_companies'>

interface PartnerSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  partnerCompanies: PartnerCompany[]
  existingPartnerIds: number[]
  onSelect: (partnerCompanyId: number, headcount: number) => void
  onCreateAndSelect: (companyName: string, headcount: number) => Promise<void>
}

export function PartnerSelectModal({
  open,
  onOpenChange,
  partnerCompanies,
  existingPartnerIds,
  onSelect,
  onCreateAndSelect,
}: PartnerSelectModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<PartnerCompany | null>(null)
  const [headcount, setHeadcount] = useState(1)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [saving, setSaving] = useState(false)

  const filteredPartners = partnerCompanies.filter((partner) => {
    if (searchQuery) {
      return partner.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const handleSelectPartner = (partner: PartnerCompany) => {
    setSelectedPartner(partner)
    setHeadcount(1)
  }

  const handleConfirm = () => {
    if (selectedPartner) {
      onSelect(selectedPartner.id, headcount)
      resetAndClose()
    }
  }

  const handleCreateNew = async () => {
    if (!newCompanyName.trim()) {
      alert('会社名を入力してください')
      return
    }

    setSaving(true)
    try {
      await onCreateAndSelect(newCompanyName.trim(), headcount)
      resetAndClose()
    } catch {
      alert('追加に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const resetAndClose = () => {
    setSelectedPartner(null)
    setSearchQuery('')
    setHeadcount(1)
    setIsCreatingNew(false)
    setNewCompanyName('')
    onOpenChange(false)
  }

  const handleClose = () => {
    resetAndClose()
  }

  // 新規作成モードの人数選択
  if (isCreatingNew && newCompanyName.trim()) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>協力会社を追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-600 mb-1">新規登録</p>
              <p className="font-medium">{newCompanyName}</p>
            </div>

            <div className="space-y-2">
              <Label>人数</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHeadcount(Math.max(1, headcount - 1))}
                  disabled={headcount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center text-2xl font-bold">
                  {headcount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHeadcount(headcount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setHeadcount(1)
                  setNewCompanyName('')
                }}
                disabled={saving}
              >
                戻る
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateNew}
                disabled={saving}
              >
                {saving ? '追加中...' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 新規入力モード
  if (isCreatingNew) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新しい協力会社を追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>会社名</Label>
              <Input
                placeholder="会社名を入力"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsCreatingNew(false)
                  setNewCompanyName('')
                }}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (newCompanyName.trim()) {
                    setHeadcount(1)
                  }
                }}
                disabled={!newCompanyName.trim()}
              >
                次へ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 既存から選択後の人数選択
  if (selectedPartner) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>協力会社を追加</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="font-medium">{selectedPartner.name}</p>
            </div>

            <div className="space-y-2">
              <Label>人数</Label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHeadcount(Math.max(1, headcount - 1))}
                  disabled={headcount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-center text-2xl font-bold">
                  {headcount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHeadcount(headcount + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedPartner(null)}
              >
                戻る
              </Button>
              <Button className="flex-1" onClick={handleConfirm}>
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 一覧表示（初期状態）
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>協力会社を追加</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 検索 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="会社名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 協力会社リスト */}
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {filteredPartners.length === 0 && !searchQuery ? (
              <p className="py-4 text-center text-sm text-gray-500">
                協力会社が登録されていません
              </p>
            ) : (
              <>
                {filteredPartners.map((partner) => {
                  const isExisting = existingPartnerIds.includes(partner.id)
                  return (
                    <button
                      key={partner.id}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left transition-colors',
                        isExisting
                          ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                          : 'hover:bg-blue-50'
                      )}
                      onClick={() => !isExisting && handleSelectPartner(partner)}
                      disabled={isExisting}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{partner.name}</span>
                        {isExisting && (
                          <Badge variant="secondary" className="text-xs">
                            追加済み
                          </Badge>
                        )}
                      </div>
                    </button>
                  )
                })}
                {filteredPartners.length === 0 && searchQuery && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    「{searchQuery}」に一致する会社が見つかりません
                  </p>
                )}
              </>
            )}
          </div>

          {/* 新規追加リンク */}
          <button
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 py-2"
            onClick={() => setIsCreatingNew(true)}
          >
            <Plus className="inline-block h-4 w-4 mr-1" />
            新しい協力会社を追加
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
