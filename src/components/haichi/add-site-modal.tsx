'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
  payer_company?: Tables<'companies'>
  default_foreman_id?: number
}
type Company = Tables<'companies'>
type Worker = Tables<'workers'>

interface AddSiteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sites: Site[]
  companies: Company[]
  foremanCandidates: Worker[]
  existingSiteIds: number[]
  onAdd: (data: {
    siteId?: number
    siteName?: string
    clientCompanyId: number
    payerCompanyId: number
    contractType: '常用' | '請負'
    shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
    memo?: string
    foremanId?: number
  }) => void
}

export function AddSiteModal({
  open,
  onOpenChange,
  sites,
  companies,
  foremanCandidates,
  existingSiteIds,
  onAdd,
}: AddSiteModalProps) {
  const [activeTab, setActiveTab] = useState<'master' | 'free'>('master')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)

  // 共通フォーム
  const [contractType, setContractType] = useState<'常用' | '請負'>('常用')
  const [shiftType, setShiftType] = useState<'日勤のみ' | '通し夜勤' | '夜勤のみ'>('日勤のみ')
  const [memo, setMemo] = useState('')
  const [foremanId, setForemanId] = useState<string>('')

  // フリー入力用
  const [freeSiteName, setFreeSiteName] = useState('')
  const [freeClientCompanyId, setFreeClientCompanyId] = useState('')
  const [freePayerCompanyId, setFreePayerCompanyId] = useState('')

  const resetForm = () => {
    setSearchQuery('')
    setSelectedSite(null)
    setContractType('常用')
    setShiftType('日勤のみ')
    setMemo('')
    setForemanId('')
    setFreeSiteName('')
    setFreeClientCompanyId('')
    setFreePayerCompanyId('')
    setActiveTab('master')
  }

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const filteredSites = sites.filter((site) => {
    // 既に配置済みの現場は除外
    if (existingSiteIds.includes(site.id)) return false

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        site.name.toLowerCase().includes(query) ||
        site.client_company?.name?.toLowerCase().includes(query) ||
        site.construction_number?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const handleSelectSite = (site: Site) => {
    setSelectedSite(site)
    // 現場のデフォルト契約区分をセット
    if (site.default_contract_type) {
      setContractType(site.default_contract_type)
    }
    // 現場のデフォルト職長をセット
    if (site.default_foreman_id) {
      setForemanId(site.default_foreman_id.toString())
    }
  }

  const handleAddFromMaster = () => {
    if (!selectedSite) return

    onAdd({
      siteId: selectedSite.id,
      clientCompanyId: selectedSite.client_company_id,
      payerCompanyId: selectedSite.payer_company_id,
      contractType,
      shiftType,
      memo: memo || undefined,
      foremanId: foremanId ? parseInt(foremanId) : undefined,
    })
  }

  const handleAddFromFree = () => {
    if (!freeSiteName || !freeClientCompanyId || !freePayerCompanyId) {
      alert('必須項目を入力してください')
      return
    }

    onAdd({
      siteName: freeSiteName,
      clientCompanyId: parseInt(freeClientCompanyId),
      payerCompanyId: parseInt(freePayerCompanyId),
      contractType,
      shiftType,
      memo: memo || undefined,
      foremanId: foremanId ? parseInt(foremanId) : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>現場を追加</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'master' | 'free')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="master">マスターから選択</TabsTrigger>
            <TabsTrigger value="free">フリー入力</TabsTrigger>
          </TabsList>

          <TabsContent value="master" className="space-y-4">
            {selectedSite ? (
              <>
                {/* 選択済み現場 */}
                <div className="rounded-lg border bg-blue-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedSite.name}</p>
                      <p className="text-sm text-gray-500">
                        {selectedSite.client_company?.name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSite(null)}
                    >
                      変更
                    </Button>
                  </div>
                </div>

                {/* 契約区分・勤務区分 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>契約区分</Label>
                    <Select
                      value={contractType}
                      onValueChange={(v) => setContractType(v as '常用' | '請負')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="常用">常用</SelectItem>
                        <SelectItem value="請負">請負</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>勤務区分</Label>
                    <Select
                      value={shiftType}
                      onValueChange={(v) =>
                        setShiftType(v as '日勤のみ' | '通し夜勤' | '夜勤のみ')
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="日勤のみ">日勤のみ</SelectItem>
                        <SelectItem value="通し夜勤">通し夜勤</SelectItem>
                        <SelectItem value="夜勤のみ">夜勤のみ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 職長 */}
                <div className="space-y-2">
                  <Label>職長（任意）</Label>
                  <Select
                    value={foremanId}
                    onValueChange={(v) => setForemanId(v || '')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="職長を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {foremanCandidates.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id.toString()}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>備考</Label>
                  <Textarea
                    placeholder="備考（任意）"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>

                <Button className="w-full" onClick={handleAddFromMaster}>
                  この現場を追加
                </Button>
              </>
            ) : (
              <>
                {/* 検索 */}
                <div className="space-y-2">
                  <Label>現場を検索</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="現場名・発注元・工事番号で検索"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 検索結果 */}
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {filteredSites.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">
                      {sites.length === 0
                        ? '現場が登録されていません'
                        : existingSiteIds.length === sites.length
                        ? 'すべての現場が配置済みです'
                        : '検索結果がありません'}
                    </p>
                  ) : (
                    filteredSites.map((site) => (
                      <button
                        key={site.id}
                        className="w-full rounded-lg px-3 py-2 text-left hover:bg-blue-50"
                        onClick={() => handleSelectSite(site)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{site.name}</p>
                            <p className="text-sm text-gray-500">
                              {site.client_company?.name}
                              {site.construction_number &&
                                ` / ${site.construction_number}`}
                            </p>
                          </div>
                          {site.default_contract_type && (
                            <Badge variant="outline" className="text-xs">
                              {site.default_contract_type}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="free" className="space-y-4">
            <div className="space-y-2">
              <Label>
                現場名 <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="新しい現場名を入力"
                value={freeSiteName}
                onChange={(e) => setFreeSiteName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                発注元 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={freeClientCompanyId}
                onValueChange={(v) => setFreeClientCompanyId(v || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="発注元を選択" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                支払者 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={freePayerCompanyId}
                onValueChange={(v) => setFreePayerCompanyId(v || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="支払者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id.toString()}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  契約区分 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={contractType}
                  onValueChange={(v) => setContractType(v as '常用' | '請負')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="常用">常用</SelectItem>
                    <SelectItem value="請負">請負</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  勤務区分 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={shiftType}
                  onValueChange={(v) =>
                    setShiftType(v as '日勤のみ' | '通し夜勤' | '夜勤のみ')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="日勤のみ">日勤のみ</SelectItem>
                    <SelectItem value="通し夜勤">通し夜勤</SelectItem>
                    <SelectItem value="夜勤のみ">夜勤のみ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 職長 */}
            <div className="space-y-2">
              <Label>職長（任意）</Label>
              <Select
                value={foremanId}
                onValueChange={(v) => setForemanId(v || '')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="職長を選択" />
                </SelectTrigger>
                <SelectContent>
                  {foremanCandidates.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id.toString()}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>備考</Label>
              <Textarea
                placeholder="備考（任意）"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handleAddFromFree}>
              この現場を追加
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
