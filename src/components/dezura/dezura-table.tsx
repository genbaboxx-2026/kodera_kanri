'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, getDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type PartnerCompany = Tables<'partner_companies'>
type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
  payer_company?: Tables<'companies'>
}

type ReportWorker = Tables<'report_workers'> & {
  worker?: Worker
}

type ReportPartner = Tables<'report_partners'> & {
  partner_company?: PartnerCompany
}

type AssignmentWorker = Tables<'assignment_workers'> & {
  worker?: Worker
}

type AssignmentPartner = Tables<'assignment_partners'> & {
  partner_company?: PartnerCompany
}

type Assignment = Tables<'assignments'> & {
  site?: Site
  workers?: AssignmentWorker[]
  partners?: AssignmentPartner[]
}

type DailyReport = Tables<'daily_reports'> & {
  site?: Site
  report_workers?: ReportWorker[]
  report_partners?: ReportPartner[]
}

// 表示用の統合データ
interface DisplayRecord {
  id: number
  recordDate: string
  siteId: number
  siteName: string
  clientCompanyName: string
  payerCompanyName: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  checkStatus: '未提出' | 'ピンク' | '確定'
  // 作業員: workerId -> { present: boolean, overtimeHours: number }
  workerData: Map<number, { present: boolean; overtimeHours: number }>
  // 協力会社: partnerId -> { headcount: number, overtimeHours: number }
  partnerData: Map<number, { headcount: number; overtimeHours: number }>
  jouyoCount: number
  ukeoiCount: number
  hasReport: boolean
  dezuraRecordId: number | null
}

interface DezuraTableProps {
  initialSiteFilter?: string
}

export function DezuraTable({ initialSiteFilter = '' }: DezuraTableProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState(initialSiteFilter)
  const [clientFilter, setClientFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [displayRecords, setDisplayRecords] = useState<DisplayRecord[]>([])
  const [allWorkers, setAllWorkers] = useState<Worker[]>([])
  const [allPartnerCompanies, setAllPartnerCompanies] = useState<PartnerCompany[]>([])

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)

    const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

    // 配置データ、日報データ、全作業員、全協力会社を取得
    const [assignmentsRes, reportsRes, workersRes, partnersRes] = await Promise.all([
      supabase
        .from('assignments')
        .select(`
          *,
          site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*)),
          workers:assignment_workers(*, worker:workers(*)),
          partners:assignment_partners(*, partner_company:partner_companies(*))
        `)
        .gte('target_date', startDate)
        .lte('target_date', endDate)
        .order('target_date', { ascending: false }),
      supabase
        .from('daily_reports')
        .select(`
          *,
          site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*)),
          report_workers:report_workers(*, worker:workers(*)),
          report_partners:report_partners(*, partner_company:partner_companies(*))
        `)
        .gte('report_date', startDate)
        .lte('report_date', endDate),
      supabase
        .from('workers')
        .select('*')
        .eq('status', '在籍')
        .order('name_kana'),
      supabase
        .from('partner_companies')
        .select('*')
        .order('name'),
    ])

    const assignments = (assignmentsRes.data || []) as Assignment[]
    const reports = (reportsRes.data || []) as DailyReport[]
    if (workersRes.data) setAllWorkers(workersRes.data)
    if (partnersRes.data) setAllPartnerCompanies(partnersRes.data)

    // dezura_recordsを取得
    const { data: dezuraRecords } = await supabase
      .from('dezura_records')
      .select('*')
      .gte('record_date', startDate)
      .lte('record_date', endDate)

    // 配置と日報を日付・現場でマッチング
    const recordMap = new Map<string, DisplayRecord>()

    // まず配置データをベースにマップを作成
    for (const assignment of assignments) {
      const key = `${assignment.target_date}_${assignment.site_id}`
      const site = assignment.site

      const dezuraRecord = dezuraRecords?.find(
        dr => dr.record_date === assignment.target_date && dr.site_id === assignment.site_id
      )

      // 作業員データをMapに変換
      const workerData = new Map<number, { present: boolean; overtimeHours: number }>()
      for (const w of assignment.workers || []) {
        workerData.set(w.worker_id, { present: true, overtimeHours: 0 })
      }

      // 協力会社データをMapに変換
      const partnerData = new Map<number, { headcount: number; overtimeHours: number }>()
      for (const p of assignment.partners || []) {
        partnerData.set(p.partner_company_id, { headcount: p.headcount, overtimeHours: 0 })
      }

      recordMap.set(key, {
        id: assignment.id,
        recordDate: assignment.target_date,
        siteId: assignment.site_id,
        siteName: site?.name || '-',
        clientCompanyName: site?.client_company?.name || '-',
        payerCompanyName: site?.payer_company?.name || '-',
        contractType: assignment.contract_type,
        shiftType: assignment.shift_type,
        checkStatus: dezuraRecord?.check_status || '未提出',
        workerData,
        partnerData,
        jouyoCount: assignment.contract_type === '常用' ? (assignment.workers?.length || 0) : 0,
        ukeoiCount: assignment.contract_type === '請負' ? (assignment.workers?.length || 0) : 0,
        hasReport: false,
        dezuraRecordId: dezuraRecord?.id || null,
      })
    }

    // 日報データで上書き（日報が正）
    for (const report of reports) {
      const key = `${report.report_date}_${report.site_id}`
      const site = report.site
      const existing = recordMap.get(key)

      const dezuraRecord = dezuraRecords?.find(
        dr => dr.daily_report_id === report.id || (dr.record_date === report.report_date && dr.site_id === report.site_id)
      )

      let checkStatus: '未提出' | 'ピンク' | '確定' = '未提出'
      if (dezuraRecord) {
        checkStatus = dezuraRecord.check_status
      } else if (report.check_status === '確定') {
        checkStatus = '確定'
      } else if (report.check_status === '1人目済' || report.check_status === '提出済') {
        checkStatus = 'ピンク'
      }

      // 作業員データをMapに変換
      const workerData = new Map<number, { present: boolean; overtimeHours: number }>()
      for (const w of report.report_workers || []) {
        workerData.set(w.worker_id, { present: true, overtimeHours: w.overtime_hours || 0 })
      }

      // 協力会社データをMapに変換
      const partnerData = new Map<number, { headcount: number; overtimeHours: number }>()
      for (const p of report.report_partners || []) {
        partnerData.set(p.partner_company_id, { headcount: p.headcount, overtimeHours: p.overtime_hours || 0 })
      }

      recordMap.set(key, {
        id: report.id,
        recordDate: report.report_date,
        siteId: report.site_id,
        siteName: site?.name || existing?.siteName || '-',
        clientCompanyName: site?.client_company?.name || existing?.clientCompanyName || '-',
        payerCompanyName: site?.payer_company?.name || existing?.payerCompanyName || '-',
        contractType: report.contract_type,
        shiftType: existing?.shiftType || '日勤のみ',
        checkStatus,
        workerData,
        partnerData,
        jouyoCount: report.headcount_jouyo || 0,
        ukeoiCount: report.headcount_ukeoi || 0,
        hasReport: true,
        dezuraRecordId: dezuraRecord?.id || null,
      })
    }

    // 日付降順でソート
    const sorted = Array.from(recordMap.values()).sort((a, b) =>
      b.recordDate.localeCompare(a.recordDate)
    )

    setDisplayRecords(sorted)
    setLoading(false)
  }, [supabase, selectedMonth])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))
  }

  const handleApprove = async (record: DisplayRecord) => {
    if (!record.dezuraRecordId) {
      const { data: newRecord } = await supabase
        .from('dezura_records')
        .insert({
          record_date: record.recordDate,
          site_id: record.siteId,
          check_status: 'ピンク',
          checker1_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (newRecord) {
        fetchData()
      }
      return
    }

    let newStatus: '未提出' | 'ピンク' | '確定'
    if (record.checkStatus === '未提出') {
      newStatus = 'ピンク'
    } else if (record.checkStatus === 'ピンク') {
      newStatus = '確定'
    } else {
      return
    }

    await supabase
      .from('dezura_records')
      .update({
        check_status: newStatus,
        ...(newStatus === 'ピンク' && { checker1_at: new Date().toISOString() }),
        ...(newStatus === '確定' && { confirmed_at: new Date().toISOString() }),
      })
      .eq('id', record.dezuraRecordId)

    fetchData()
  }

  const filteredRecords = displayRecords.filter(record => {
    if (searchQuery && !record.siteName.includes(searchQuery)) return false
    if (clientFilter !== 'all' && record.clientCompanyName !== clientFilter) return false
    if (statusFilter !== 'all' && record.checkStatus !== statusFilter) return false
    return true
  })

  const statusCounts = {
    all: displayRecords.length,
    未提出: displayRecords.filter(r => r.checkStatus === '未提出').length,
    ピンク: displayRecords.filter(r => r.checkStatus === 'ピンク').length,
    確定: displayRecords.filter(r => r.checkStatus === '確定').length,
  }

  const uniqueClients = [...new Set(displayRecords.map(r => r.clientCompanyName).filter(n => n !== '-'))]

  // 表示する作業員の列を取得（この月に1回でも配置されている作業員のみ）
  const usedWorkerIds = new Set<number>()
  for (const record of displayRecords) {
    for (const [workerId] of record.workerData) {
      usedWorkerIds.add(workerId)
    }
  }
  const workerColumns = allWorkers.filter(w => usedWorkerIds.has(w.id))

  // 表示する協力会社の列を取得
  const usedPartnerCompanyIds = new Set<number>()
  for (const record of displayRecords) {
    for (const [partnerId] of record.partnerData) {
      usedPartnerCompanyIds.add(partnerId)
    }
  }
  const partnerColumns = allPartnerCompanies.filter(p => usedPartnerCompanyIds.has(p.id))

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr)
    const dayIndex = getDay(date)
    const days = ['日', '月', '火', '水', '木', '金', '土']
    return days[dayIndex]
  }

  const getStatusBgClass = (status: string) => {
    switch (status) {
      case '未提出':
        return 'bg-yellow-50'
      case 'ピンク':
        return 'bg-pink-50'
      case '確定':
        return 'bg-gray-100'
      default:
        return ''
    }
  }

  if (loading) {
    return <p className="text-center text-gray-500">読み込み中...</p>
  }

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center font-medium">
            {format(selectedMonth, 'yyyy年M月', { locale: ja })}
          </span>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="現場名で検索"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v || 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="発注元" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {uniqueClients.map((client) => (
              <SelectItem key={client} value={client}>
                {client}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ステータスフィルター */}
      <div className="flex gap-2">
        {[
          { value: 'all', label: 'すべて', bgClass: '' },
          { value: '未提出', label: '未提出', bgClass: 'bg-yellow-100' },
          { value: 'ピンク', label: 'ピンク', bgClass: 'bg-pink-100' },
          { value: '確定', label: '確定', bgClass: 'bg-gray-200' },
        ].map((status) => (
          <Badge
            key={status.value}
            variant={statusFilter === status.value ? 'default' : 'outline'}
            className={cn('cursor-pointer px-3 py-1', status.bgClass)}
            onClick={() => setStatusFilter(status.value)}
          >
            {status.label} ({statusCounts[status.value as keyof typeof statusCounts]})
          </Badge>
        ))}
      </div>

      {/* 出面表テーブル */}
      {filteredRecords.length === 0 ? (
        <p className="text-center text-gray-500 py-8">データがありません</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                {/* 固定列 */}
                <th className="sticky left-0 z-20 bg-gray-50 border-b border-r px-3 py-2 text-center font-medium whitespace-nowrap">日付</th>
                <th className="sticky left-[52px] z-20 bg-gray-50 border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">曜</th>
                <th className="sticky left-[84px] z-20 bg-gray-50 border-b border-r px-3 py-2 text-center font-medium whitespace-nowrap min-w-[100px]">現場</th>
                {/* スクロール列 */}
                <th className="border-b border-r px-3 py-2 text-center font-medium whitespace-nowrap">発注元</th>
                <th className="border-b border-r px-3 py-2 text-center font-medium whitespace-nowrap">支払者</th>
                <th className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">契約</th>
                <th className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">夜勤</th>
                {/* 作業員列 */}
                {workerColumns.map(worker => (
                  <th key={worker.id} className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap min-w-[60px]">
                    {worker.name}
                  </th>
                ))}
                {/* 協力会社列 */}
                {partnerColumns.map(partner => (
                  <th key={partner.id} className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap min-w-[60px] bg-blue-50">
                    {partner.name}
                  </th>
                ))}
                <th className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">常用計</th>
                <th className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">請負計</th>
                <th className="border-b border-r px-2 py-2 text-center font-medium whitespace-nowrap">ステータス</th>
                <th className="border-b px-2 py-2 text-center font-medium whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => {
                const bgClass = getStatusBgClass(record.checkStatus)
                const dayOfWeek = getDayOfWeek(record.recordDate)
                const isSunday = dayOfWeek === '日'
                const isSaturday = dayOfWeek === '土'
                const isNightShift = record.shiftType === '通し夜勤' || record.shiftType === '夜勤のみ'

                return (
                  <tr key={`${record.recordDate}_${record.siteId}`} className={bgClass}>
                    {/* 固定列 */}
                    <td className={cn('sticky left-0 z-10 border-b border-r px-3 py-2 text-center font-medium whitespace-nowrap', bgClass)}>
                      {format(new Date(record.recordDate), 'M/d')}
                    </td>
                    <td className={cn(
                      'sticky left-[52px] z-10 border-b border-r px-2 py-2 text-center whitespace-nowrap',
                      bgClass,
                      isSunday && 'text-red-600 font-medium',
                      isSaturday && 'text-blue-600 font-medium'
                    )}>
                      {dayOfWeek}
                    </td>
                    <td className={cn('sticky left-[84px] z-10 border-b border-r px-3 py-2 text-center whitespace-nowrap', bgClass)}>
                      {record.siteName}
                    </td>
                    {/* スクロール列 */}
                    <td className="border-b border-r px-3 py-2 text-center whitespace-nowrap">{record.clientCompanyName}</td>
                    <td className="border-b border-r px-3 py-2 text-center whitespace-nowrap">{record.payerCompanyName}</td>
                    <td className="border-b border-r px-2 py-2 text-center">
                      <Badge variant="secondary" className="text-xs">{record.contractType}</Badge>
                    </td>
                    <td className="border-b border-r px-2 py-2 text-center">
                      {isNightShift && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                          夜勤
                        </Badge>
                      )}
                    </td>
                    {/* 作業員列 */}
                    {workerColumns.map(worker => {
                      const data = record.workerData.get(worker.id)
                      if (!data?.present) {
                        return <td key={worker.id} className="border-b border-r px-2 py-2 text-center text-gray-300">-</td>
                      }
                      return (
                        <td key={worker.id} className="border-b border-r px-2 py-2 text-center">
                          {data.overtimeHours > 0 ? (
                            <span className="text-orange-600 font-medium">{data.overtimeHours}</span>
                          ) : (
                            <span className="text-green-600">○</span>
                          )}
                        </td>
                      )
                    })}
                    {/* 協力会社列 */}
                    {partnerColumns.map(partner => {
                      const data = record.partnerData.get(partner.id)
                      if (!data || data.headcount === 0) {
                        return <td key={partner.id} className="border-b border-r px-2 py-2 text-center text-gray-300 bg-blue-50/50">-</td>
                      }
                      return (
                        <td key={partner.id} className="border-b border-r px-2 py-2 text-center bg-blue-50/50">
                          <div className="flex flex-col items-center">
                            <span className="font-medium">{data.headcount}</span>
                            {data.overtimeHours > 0 && (
                              <span className="text-xs text-orange-600">+{data.overtimeHours}h</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                    <td className="border-b border-r px-2 py-2 text-center font-medium">{record.jouyoCount}</td>
                    <td className="border-b border-r px-2 py-2 text-center font-medium">{record.ukeoiCount}</td>
                    <td className="border-b border-r px-2 py-2 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          record.checkStatus === '未提出' && 'bg-yellow-200 text-yellow-900 border-yellow-400',
                          record.checkStatus === 'ピンク' && 'bg-pink-200 text-pink-900 border-pink-400',
                          record.checkStatus === '確定' && 'bg-gray-200 text-gray-800 border-gray-400'
                        )}
                      >
                        {record.checkStatus}
                      </Badge>
                    </td>
                    <td className="border-b px-2 py-2 text-center">
                      {record.checkStatus !== '確定' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleApprove(record)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          承認
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
