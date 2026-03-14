'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SiteDetailPanel } from './site-detail-panel'
import { SiteAddModal } from './site-add-modal'
import { Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Company = Tables<'companies'>
type Worker = Tables<'workers'>
type Site = Tables<'sites'> & {
  client_company?: Company
  payer_company?: Company
  default_foreman?: Worker
}

interface TodayForeman {
  siteId: number
  foremanName: string
}

// 日報ステータス: 'submitted' = 提出済み, 'pending' = 未提出, 'none' = 配置なし
type ReportStatus = 'submitted' | 'pending' | 'none'

interface TodayReportStatus {
  siteId: number
  status: ReportStatus
}

export function SiteListTable() {
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [foremanCandidates, setForemanCandidates] = useState<Worker[]>([])
  const [todayForemen, setTodayForemen] = useState<TodayForeman[]>([])
  const [todayReportStatuses, setTodayReportStatuses] = useState<TodayReportStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [sitesRes, companiesRes, workersRes, assignmentsRes, reportsRes] = await Promise.all([
      supabase.from('sites').select(`
        *,
        client_company:companies!sites_client_company_id_fkey(*),
        payer_company:companies!sites_payer_company_id_fkey(*),
        default_foreman:workers!sites_default_foreman_id_fkey(*)
      `).order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('workers').select('*').eq('status', '在籍').order('name_kana'),
      // 本日の配置から職長を取得
      supabase.from('assignments').select(`
        site_id,
        workers:assignment_workers!inner(
          is_foreman,
          worker:workers(name)
        )
      `).eq('target_date', today),
      // 本日の日報を取得
      supabase.from('daily_reports').select('site_id').eq('report_date', today),
    ])

    if (sitesRes.data) {
      setSites(sitesRes.data as Site[])
    }
    if (companiesRes.data) setCompanies(companiesRes.data)
    if (workersRes.data) setForemanCandidates(workersRes.data)

    // 本日の職長データを整形
    const assignedSiteIds = new Set<number>()
    if (assignmentsRes.data) {
      const foremen: TodayForeman[] = []
      for (const assignment of assignmentsRes.data) {
        assignedSiteIds.add(assignment.site_id)
        const workers = assignment.workers as unknown as { is_foreman?: boolean; worker?: { name: string } }[]
        const foreman = workers?.find(w => w.is_foreman)
        if (foreman?.worker?.name) {
          foremen.push({
            siteId: assignment.site_id,
            foremanName: foreman.worker.name,
          })
        }
      }
      setTodayForemen(foremen)
    }

    // 本日の日報ステータスを整形
    const submittedSiteIds = new Set<number>()
    if (reportsRes.data) {
      for (const report of reportsRes.data) {
        submittedSiteIds.add(report.site_id)
      }
    }

    // 各サイトのステータスを決定
    if (sitesRes.data) {
      const statuses: TodayReportStatus[] = sitesRes.data.map(site => {
        if (submittedSiteIds.has(site.id)) {
          return { siteId: site.id, status: 'submitted' as ReportStatus }
        } else if (assignedSiteIds.has(site.id)) {
          return { siteId: site.id, status: 'pending' as ReportStatus }
        } else {
          return { siteId: site.id, status: 'none' as ReportStatus }
        }
      })
      setTodayReportStatuses(statuses)
    }

    setLoading(false)
  }

  const handleCompleteSite = async (siteId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase
      .from('sites')
      .update({ status: '完了' })
      .eq('id', siteId)

    if (error) {
      console.error('Error completing site:', error)
      return
    }

    fetchData()
    if (selectedSite?.id === siteId) {
      setSelectedSite(null)
    }
  }

  const filteredSites = sites
    .filter((site) => {
      if (searchQuery && !site.name.includes(searchQuery)) return false
      if (clientFilter !== 'all' && site.client_company?.name !== clientFilter) return false
      if (statusFilter !== 'all' && site.status !== statusFilter) return false
      return true
    })
    .sort((a, b) => {
      if (a.status === '稼働中' && b.status === '完了') return -1
      if (a.status === '完了' && b.status === '稼働中') return 1
      return 0
    })

  const statusCounts = {
    all: sites.length,
    稼働中: sites.filter((s) => s.status === '稼働中').length,
    完了: sites.filter((s) => s.status === '完了').length,
  }

  const uniqueClients = [...new Set(sites.map(s => s.client_company?.name).filter(Boolean))]

  if (loading) {
    return <p className="text-sm text-gray-500">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="現場名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={clientFilter} onValueChange={(value) => setClientFilter(value || 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="発注元" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {uniqueClients.map((client) => (
              <SelectItem key={client} value={client || ''}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          現場を新規登録
        </Button>
      </div>

      {/* ステータスフィルター */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'すべて' },
          { value: '稼働中', label: '稼働中' },
          { value: '完了', label: '完了' },
        ].map((status) => (
          <Badge
            key={status.value}
            variant={statusFilter === status.value ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1"
            onClick={() => setStatusFilter(status.value)}
          >
            {status.label} ({statusCounts[status.value as keyof typeof statusCounts]})
          </Badge>
        ))}
      </div>

      {sites.length === 0 ? (
        <p className="text-sm text-gray-500">現場が登録されていません</p>
      ) : (
        <div className="flex gap-6">
          {/* 現場テーブル */}
          <div className="flex-1 overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">現場名</TableHead>
                  <TableHead className="text-center">発注元</TableHead>
                  <TableHead className="text-center">職長</TableHead>
                  <TableHead className="text-center">支払者</TableHead>
                  <TableHead className="text-center">着工日</TableHead>
                  <TableHead className="text-center">完工予定</TableHead>
                  <TableHead className="text-center">日報</TableHead>
                  <TableHead className="text-center">ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSites.map((site) => {
                  const reportStatus = todayReportStatuses.find(s => s.siteId === site.id)?.status || 'none'
                  return (
                    <TableRow
                      key={site.id}
                      className={cn(
                        'cursor-pointer',
                        site.status === '完了' && 'opacity-50',
                        selectedSite?.id === site.id && 'bg-blue-50'
                      )}
                      onClick={() => setSelectedSite(site)}
                    >
                      <TableCell className="text-center">
                        <span className="text-blue-600 hover:underline font-medium">
                          {site.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">{site.client_company?.name || '-'}</TableCell>
                      <TableCell className="text-center">
                        {todayForemen.find(f => f.siteId === site.id)?.foremanName || '-'}
                      </TableCell>
                      <TableCell className="text-center">{site.payer_company?.name || '-'}</TableCell>
                      <TableCell className="text-center">{site.start_date || '-'}</TableCell>
                      <TableCell className="text-center">{site.end_date || '-'}</TableCell>
                      <TableCell className="text-center">
                        {reportStatus === 'submitted' ? (
                          <Badge
                            className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dezura?site=${encodeURIComponent(site.name)}`)
                            }}
                          >
                            提出済み
                          </Badge>
                        ) : reportStatus === 'pending' ? (
                          <Badge
                            className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dezura?site=${encodeURIComponent(site.name)}`)
                            }}
                          >
                            未提出
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {site.status === '稼働中' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCompleteSite(site.id, e)}
                          >
                            完了にする
                          </Button>
                        ) : (
                          <Badge variant="secondary">完了</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* 詳細パネル */}
          {selectedSite && (
            <SiteDetailPanel
              site={selectedSite}
              companies={companies}
              foremanCandidates={foremanCandidates}
              todayForemanName={todayForemen.find(f => f.siteId === selectedSite.id)?.foremanName}
              onClose={() => setSelectedSite(null)}
              onUpdate={fetchData}
            />
          )}
        </div>
      )}

      {/* 現場追加モーダル */}
      <SiteAddModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        companies={companies}
        foremanCandidates={foremanCandidates}
        onSuccess={fetchData}
      />
    </div>
  )
}
