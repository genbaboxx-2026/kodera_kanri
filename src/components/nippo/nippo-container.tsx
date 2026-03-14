'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Minus, X, Pen, Check, Pencil, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DateNav } from '@/components/haichi/date-nav'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type PartnerCompany = Tables<'partner_companies'>
type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
  payer_company?: Tables<'companies'>
}
type Assignment = Tables<'assignments'> & {
  site?: Site
  workers?: (Tables<'assignment_workers'> & { worker?: Worker })[]
  partners?: (Tables<'assignment_partners'> & { partner_company?: PartnerCompany })[]
}
type DailyReport = Tables<'daily_reports'> & {
  site?: Site
  report_workers?: (Tables<'report_workers'> & { worker?: Worker })[]
  report_partners?: (Tables<'report_partners'> & { partner_company?: PartnerCompany })[]
}
type WorkCategory = Tables<'work_categories'>

interface NippoContainerProps {
  userId: string
  workerId: number | null
  assignmentId?: number
  targetDate: string
}

// 作業者行データ
interface WorkerRowData {
  workerId: number
  name: string
  startTime: string
  endTime: string
  overtimeHours: number
}

// 協力会社行データ
interface PartnerRowData {
  partnerCompanyId: number
  name: string
  headcount: number
  startTime: string
  endTime: string
  overtimeHours: number
}

export function NippoContainer({ userId, workerId, assignmentId, targetDate }: NippoContainerProps) {
  const router = useRouter()
  const supabase = createClient()

  // 日付ナビゲーション用
  const [currentDate, setCurrentDate] = useState(new Date(targetDate))

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [existingReport, setExistingReport] = useState<DailyReport | null>(null)
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>([])
  const [allWorkers, setAllWorkers] = useState<Worker[]>([])
  const [allPartners, setAllPartners] = useState<PartnerCompany[]>([])
  const [foremanWorkerId, setForemanWorkerId] = useState<number | null>(null)
  const [hasSigned, setHasSigned] = useState(false)

  // フォームデータ
  const [contractType, setContractType] = useState<'常用' | '請負'>('常用')
  const [shiftType, setShiftType] = useState<'日勤のみ' | '通し夜勤' | '夜勤のみ'>('日勤のみ')
  const [defaultWorkStart, setDefaultWorkStart] = useState('08:00')
  const [defaultWorkEnd, setDefaultWorkEnd] = useState('17:00')
  const [nightWorkStart, setNightWorkStart] = useState('22:00')
  const [nightWorkEnd, setNightWorkEnd] = useState('05:00')
  const [workerRows, setWorkerRows] = useState<WorkerRowData[]>([])
  const [partnerRows, setPartnerRows] = useState<PartnerRowData[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [workDetail, setWorkDetail] = useState('')
  const [remarks, setRemarks] = useState('')

  // モーダル
  const [workerModalOpen, setWorkerModalOpen] = useState(false)
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [lastCreatedReportId, setLastCreatedReportId] = useState<number | null>(null)

  // 編集中の行
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null)
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null)

  // 日付の状態
  const today = startOfDay(new Date())
  const isFutureDate = isAfter(startOfDay(currentDate), today)
  const isSubmitted = existingReport !== null
  const currentDateStr = format(currentDate, 'yyyy-MM-dd')

  // 時間選択用の配列
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = ['00', '30'] // 30分単位

  // 時間をパース
  const parseTime = (time: string) => {
    const [h, m] = time.split(':')
    return { hour: h || '08', minute: m || '00' }
  }

  // 時間を組み立て
  const buildTime = (hour: string, minute: string) => `${hour}:${minute}`

  // 残業時間計算（終了時間 - 17:00、0.5h単位）
  const calculateOvertimeHours = (endTime: string, baseEndTime: string = '17:00'): number => {
    if (!endTime) return 0
    const [endH, endM] = endTime.split(':').map(Number)
    const [baseH, baseM] = baseEndTime.split(':').map(Number)

    const endMinutes = endH * 60 + endM
    const baseMinutes = baseH * 60 + baseM

    if (endMinutes <= baseMinutes) return 0

    const overtimeMinutes = endMinutes - baseMinutes
    return Math.ceil(overtimeMinutes / 30) * 0.5
  }

  // 作業者の終了時間変更
  const updateWorkerEndTime = (wId: number, endTime: string) => {
    setWorkerRows(prev => prev.map(w => {
      if (w.workerId !== wId) return w
      return {
        ...w,
        endTime,
        overtimeHours: calculateOvertimeHours(endTime, defaultWorkEnd),
      }
    }))
  }

  // 作業者の開始時間変更
  const updateWorkerStartTime = (wId: number, startTime: string) => {
    setWorkerRows(prev => prev.map(w => {
      if (w.workerId !== wId) return w
      return { ...w, startTime }
    }))
  }

  // 協力会社の終了時間変更
  const updatePartnerEndTime = (partnerCompanyId: number, endTime: string) => {
    setPartnerRows(prev => prev.map(p => {
      if (p.partnerCompanyId !== partnerCompanyId) return p
      return {
        ...p,
        endTime,
        overtimeHours: calculateOvertimeHours(endTime, defaultWorkEnd),
      }
    }))
  }

  // 協力会社の開始時間変更
  const updatePartnerStartTime = (partnerCompanyId: number, startTime: string) => {
    setPartnerRows(prev => prev.map(p => {
      if (p.partnerCompanyId !== partnerCompanyId) return p
      return { ...p, startTime }
    }))
  }

  // 協力会社の人数変更
  const updatePartnerHeadcount = (partnerCompanyId: number, delta: number) => {
    setPartnerRows(prev => prev.map(p => {
      if (p.partnerCompanyId !== partnerCompanyId) return p
      const newHeadcount = Math.max(0, p.headcount + delta)
      return { ...p, headcount: newHeadcount }
    }))
  }

  // 作業者を追加
  const addWorker = (worker: Worker) => {
    if (workerRows.some(w => w.workerId === worker.id)) return
    setWorkerRows(prev => [...prev, {
      workerId: worker.id,
      name: worker.name,
      startTime: defaultWorkStart,
      endTime: defaultWorkEnd,
      overtimeHours: 0,
    }])
  }

  // 作業者を削除
  const removeWorker = (wId: number) => {
    setWorkerRows(prev => prev.filter(w => w.workerId !== wId))
  }

  // 協力会社を追加
  const addPartner = (partner: PartnerCompany) => {
    if (partnerRows.some(p => p.partnerCompanyId === partner.id)) return
    setPartnerRows(prev => [...prev, {
      partnerCompanyId: partner.id,
      name: partner.name,
      headcount: 1,
      startTime: defaultWorkStart,
      endTime: defaultWorkEnd,
      overtimeHours: 0,
    }])
    setPartnerModalOpen(false)
  }

  // 協力会社を削除
  const removePartner = (partnerCompanyId: number) => {
    setPartnerRows(prev => prev.filter(p => p.partnerCompanyId !== partnerCompanyId))
  }

  // フォームをリセット
  const resetForm = () => {
    setAssignment(null)
    setExistingReport(null)
    setContractType('常用')
    setShiftType('日勤のみ')
    setDefaultWorkStart('08:00')
    setDefaultWorkEnd('17:00')
    setNightWorkStart('22:00')
    setNightWorkEnd('05:00')
    setWorkerRows([])
    setPartnerRows([])
    setSelectedCategories([])
    setWorkDetail('')
    setRemarks('')
    setForemanWorkerId(null)
    setHasSigned(false)
  }

  // 配置データをプリセットする共通関数
  const applyAssignmentPreset = (assignmentData: Assignment) => {
    setAssignment(assignmentData)
    setContractType(assignmentData.contract_type)
    setShiftType(assignmentData.shift_type)

    const foreman = assignmentData.workers?.find((w) => w.is_foreman)
    if (foreman) {
      setForemanWorkerId(foreman.worker_id)
    }

    // 勤務区分によってデフォルト時間を設定
    let startTime = '08:00'
    let endTime = '17:00'
    if (assignmentData.shift_type === '夜勤のみ') {
      startTime = '22:00'
      endTime = '05:00'
    } else if (assignmentData.shift_type === '通し夜勤') {
      // 通し夜勤は日勤パート
      startTime = '08:00'
      endTime = '17:00'
      setNightWorkStart('22:00')
      setNightWorkEnd('05:00')
    }
    setDefaultWorkStart(startTime)
    setDefaultWorkEnd(endTime)

    const workers = assignmentData.workers?.map((w) => ({
      workerId: w.worker_id,
      name: w.worker?.name || '',
      startTime,
      endTime,
      overtimeHours: 0,
    })) || []
    setWorkerRows(workers)

    const partners = assignmentData.partners?.map((p) => ({
      partnerCompanyId: p.partner_company_id,
      name: p.partner_company?.name || '',
      headcount: p.headcount,
      startTime,
      endTime,
      overtimeHours: 0,
    })) || []
    setPartnerRows(partners)
  }

  // 既存の日報データを表示用にセット
  const applyExistingReport = (report: DailyReport, assignmentShiftType?: '日勤のみ' | '通し夜勤' | '夜勤のみ') => {
    setExistingReport(report)
    setContractType(report.contract_type)
    setDefaultWorkStart(report.work_start)
    setDefaultWorkEnd(report.work_end)
    setWorkDetail(report.work_detail || '')
    setRemarks(report.remarks || '')

    // 夜勤時間がある場合は通し夜勤
    if (report.night_start && report.night_end) {
      setShiftType('通し夜勤')
      setNightWorkStart(report.night_start)
      setNightWorkEnd(report.night_end)
    } else if (assignmentShiftType) {
      setShiftType(assignmentShiftType)
    }

    const workers = report.report_workers?.map((w) => ({
      workerId: w.worker_id,
      name: w.worker?.name || '',
      startTime: w.work_start || report.work_start,
      endTime: w.work_end || report.work_end,
      overtimeHours: w.overtime_hours || 0,
    })) || []
    setWorkerRows(workers)

    const partners = report.report_partners?.map((p) => ({
      partnerCompanyId: p.partner_company_id,
      name: p.partner_company?.name || '',
      headcount: p.headcount,
      startTime: p.work_start || report.work_start,
      endTime: p.work_end || report.work_end,
      overtimeHours: p.overtime_hours || 0,
    })) || []
    setPartnerRows(partners)
  }

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true)
    resetForm()

    const dateStr = format(currentDate, 'yyyy-MM-dd')

    const [categoriesRes, workersRes, partnersRes] = await Promise.all([
      supabase.from('work_categories').select('*').order('display_order'),
      supabase.from('workers').select('*').eq('status', '在籍').order('name_kana'),
      supabase.from('partner_companies').select('*').order('name'),
    ])

    if (categoriesRes.data) setWorkCategories(categoriesRes.data)
    if (workersRes.data) setAllWorkers(workersRes.data)
    if (partnersRes.data) setAllPartners(partnersRes.data)

    // まず既存の日報を検索（職長の日報）
    if (workerId) {
      const { data: existingReportData } = await supabase
        .from('daily_reports')
        .select(`
          *,
          site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*)),
          report_workers:report_workers(*, worker:workers(*)),
          report_partners:report_partners(*, partner_company:partner_companies(*))
        `)
        .eq('report_date', dateStr)
        .eq('reporter_id', workerId)
        .single()

      if (existingReportData) {
        // 対応する配置も取得してshiftTypeを取得
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select(`
            *,
            site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*))
          `)
          .eq('target_date', dateStr)
          .eq('site_id', existingReportData.site_id)
          .single()

        // サインの有無を確認
        const { data: signatureData } = await supabase
          .from('signatures')
          .select('id')
          .eq('daily_report_id', existingReportData.id)
          .limit(1)
          .single()

        setHasSigned(!!signatureData)

        // 既存の日報がある場合は表示
        applyExistingReport(
          existingReportData as DailyReport,
          (assignmentData as Assignment)?.shift_type
        )

        if (assignmentData) {
          setAssignment(assignmentData as Assignment)
        }
        setLoading(false)
        return
      }
    }

    // 既存の日報がない場合は配置データを検索してプリセット
    if (workerId) {
      const { data: assignmentWorker } = await supabase
        .from('assignment_workers')
        .select(`
          assignment_id,
          is_foreman,
          assignment:assignments!inner(id, target_date)
        `)
        .eq('worker_id', workerId)
        .eq('is_foreman', true)
        .eq('assignment.target_date', dateStr)
        .limit(1)
        .single()

      if (assignmentWorker) {
        const { data: assignmentData } = await supabase
          .from('assignments')
          .select(`
            *,
            site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*)),
            workers:assignment_workers(*, worker:workers(*)),
            partners:assignment_partners(*, partner_company:partner_companies(*))
          `)
          .eq('id', assignmentWorker.assignment_id)
          .single()

        if (assignmentData) {
          applyAssignmentPreset(assignmentData as Assignment)
        }
      }
    }

    setLoading(false)
  }, [supabase, workerId, currentDate])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 日付ナビゲーション
  const handlePrevDay = () => {
    setCurrentDate(prev => subDays(prev, 1))
  }

  const handleNextDay = () => {
    setCurrentDate(prev => addDays(prev, 1))
  }

  // デフォルト作業時間が変更されたら全作業者・協力会社の時間を更新
  const handleDefaultWorkStartChange = (newStart: string) => {
    setDefaultWorkStart(newStart)
    setWorkerRows(prev => prev.map(w => ({ ...w, startTime: newStart })))
    setPartnerRows(prev => prev.map(p => ({ ...p, startTime: newStart })))
  }

  const handleDefaultWorkEndChange = (newEnd: string) => {
    setDefaultWorkEnd(newEnd)
    setWorkerRows(prev => prev.map(w => ({
      ...w,
      endTime: newEnd,
      overtimeHours: calculateOvertimeHours(newEnd, newEnd),
    })))
    setPartnerRows(prev => prev.map(p => ({
      ...p,
      endTime: newEnd,
      overtimeHours: calculateOvertimeHours(newEnd, newEnd),
    })))
  }

  // 勤務区分変更
  const handleShiftTypeChange = (newShiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ') => {
    setShiftType(newShiftType)

    // 勤務区分に応じてデフォルト時間を変更
    if (newShiftType === '日勤のみ') {
      setDefaultWorkStart('08:00')
      setDefaultWorkEnd('17:00')
      setWorkerRows(prev => prev.map(w => ({ ...w, startTime: '08:00', endTime: '17:00', overtimeHours: 0 })))
      setPartnerRows(prev => prev.map(p => ({ ...p, startTime: '08:00', endTime: '17:00', overtimeHours: 0 })))
    } else if (newShiftType === '通し夜勤') {
      setDefaultWorkStart('08:00')
      setDefaultWorkEnd('17:00')
      setNightWorkStart('22:00')
      setNightWorkEnd('05:00')
      setWorkerRows(prev => prev.map(w => ({ ...w, startTime: '08:00', endTime: '17:00', overtimeHours: 0 })))
      setPartnerRows(prev => prev.map(p => ({ ...p, startTime: '08:00', endTime: '17:00', overtimeHours: 0 })))
    } else if (newShiftType === '夜勤のみ') {
      setDefaultWorkStart('22:00')
      setDefaultWorkEnd('05:00')
      setWorkerRows(prev => prev.map(w => ({ ...w, startTime: '22:00', endTime: '05:00', overtimeHours: 0 })))
      setPartnerRows(prev => prev.map(p => ({ ...p, startTime: '22:00', endTime: '05:00', overtimeHours: 0 })))
    }
  }

  // 作業内容カテゴリ切り替え
  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // 確認ダイアログを開く
  const handleSubmit = () => {
    if (!assignment) {
      alert('配置データが見つかりません')
      return
    }

    if (workerRows.length === 0) {
      alert('作業者を選択してください')
      return
    }

    setConfirmDialogOpen(true)
  }

  // サインをもらう（サイン画面へ遷移）
  const handleGoToSign = async () => {
    if (!assignment) {
      alert('配置データが見つかりません')
      return
    }

    if (workerRows.length === 0) {
      alert('作業者を選択してください')
      return
    }

    // まだ提出していない場合は先に提出
    if (!existingReport) {
      setSubmitting(true)
      const reportId = await executeSubmit()
      setSubmitting(false)
      if (reportId) {
        router.push(`/sign?report_id=${reportId}`)
      }
    } else {
      // 既に提出済みの場合はサイン画面へ
      router.push(`/sign?report_id=${existingReport.id}`)
    }
  }

  // 実際の日報提出処理
  const executeSubmit = async (): Promise<number | null> => {
    if (!assignment) return null

    const headcountTotal = workerRows.length + partnerRows.reduce((sum, p) => sum + p.headcount, 0)
    const headcountJouyo = contractType === '常用' ? workerRows.length : 0
    const headcountUkeoi = contractType === '請負' ? workerRows.length : 0

    const { data: report, error: reportError } = await supabase
      .from('daily_reports')
      .insert({
        report_date: currentDateStr,
        site_id: assignment.site_id,
        reporter_id: foremanWorkerId || workerId || 1,
        contract_type: contractType,
        work_start: defaultWorkStart,
        work_end: defaultWorkEnd,
        night_start: shiftType === '通し夜勤' ? nightWorkStart : null,
        night_end: shiftType === '通し夜勤' ? nightWorkEnd : null,
        headcount_total: headcountTotal,
        headcount_jouyo: headcountJouyo,
        headcount_ukeoi: headcountUkeoi,
        work_detail: workDetail || null,
        remarks: remarks || null,
        check_status: '提出済',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (reportError || !report) {
      console.error('Error creating report:', reportError)
      alert('日報の作成に失敗しました')
      return null
    }

    if (workerRows.length > 0) {
      await supabase.from('report_workers').insert(
        workerRows.map(w => ({
          daily_report_id: report.id,
          worker_id: w.workerId,
          work_start: w.startTime,
          work_end: w.endTime,
          overtime_hours: w.overtimeHours > 0 ? w.overtimeHours : null,
        }))
      )
    }

    if (selectedCategories.length > 0) {
      await supabase.from('report_work_categories').insert(
        selectedCategories.map(categoryId => ({
          daily_report_id: report.id,
          work_category_id: categoryId,
        }))
      )
    }

    if (partnerRows.length > 0) {
      await supabase.from('report_partners').insert(
        partnerRows.map(p => ({
          daily_report_id: report.id,
          partner_company_id: p.partnerCompanyId,
          headcount: p.headcount,
          work_start: p.startTime,
          work_end: p.endTime,
          overtime_hours: p.overtimeHours > 0 ? p.overtimeHours : null,
        }))
      )
    }

    // dezura_recordsを作成または更新
    const { data: existingDezura } = await supabase
      .from('dezura_records')
      .select('id')
      .eq('record_date', currentDateStr)
      .eq('site_id', assignment.site_id)
      .single()

    if (existingDezura) {
      await supabase
        .from('dezura_records')
        .update({
          daily_report_id: report.id,
          assignment_id: assignment.id,
          check_status: '未提出',
        })
        .eq('id', existingDezura.id)
    } else {
      await supabase.from('dezura_records').insert({
        record_date: currentDateStr,
        site_id: assignment.site_id,
        assignment_id: assignment.id,
        daily_report_id: report.id,
        check_status: '未提出',
      })
    }

    return report.id
  }

  // 確認ダイアログから提出
  const handleConfirmSubmit = async () => {
    setConfirmDialogOpen(false)
    setSubmitting(true)

    const reportId = await executeSubmit()

    setSubmitting(false)

    if (reportId) {
      setLastCreatedReportId(reportId)
      // データを再読み込みして提出済み状態に切り替え
      await fetchData()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />
        <div className="p-4 text-center text-gray-500">読み込み中...</div>
      </div>
    )
  }

  // 未来の日付の場合
  if (isFutureDate) {
    return (
      <div className="flex flex-col">
        <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">まだ作業が行われていません</p>
          <p className="text-gray-400 text-sm mt-2">過去の日付を選択してください</p>
        </div>
      </div>
    )
  }

  // 提出済みの場合（閲覧モード）
  if (isSubmitted) {
    return (
      <div className="flex flex-col">
        <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />

        {/* 報告済みバッジ - 目立つように表示 */}
        <div className="bg-green-100 border-b-2 border-green-300 px-4 py-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-full">
              <Check className="h-5 w-5" />
              <span className="font-bold">報告済み</span>
            </div>
            {hasSigned && (
              <div className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm">
                <Pen className="h-4 w-4" />
                <span className="font-medium">サイン済み</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 p-4 pb-24">
          {/* 現場情報 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">現場情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{assignment?.site?.name || existingReport?.site?.name || '-'}</span>
                <div className="flex items-center gap-2">
                  <Badge>{contractType}</Badge>
                  {shiftType !== '日勤のみ' && (
                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                      {shiftType}
                    </Badge>
                  )}
                </div>
              </div>
              {(assignment?.site || existingReport?.site) && (
                <div className="text-sm text-gray-500">
                  発注元: {assignment?.site?.client_company?.name || existingReport?.site?.client_company?.name} /
                  支払者: {assignment?.site?.payer_company?.name || existingReport?.site?.payer_company?.name}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 作業時間 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">作業時間</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {shiftType === '通し夜勤' ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">日勤</span>
                    <span className="font-medium">{defaultWorkStart} 〜 {defaultWorkEnd}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">夜勤</span>
                    <span className="font-medium">{nightWorkStart} 〜 翌{nightWorkEnd}</span>
                  </div>
                </>
              ) : (
                <p className="text-lg font-medium">
                  {defaultWorkStart} 〜 {shiftType === '夜勤のみ' ? '翌' : ''}{defaultWorkEnd}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 作業者 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">作業者（{workerRows.length}名）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {workerRows.map(w => (
                <div key={w.workerId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium">{w.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{w.startTime}〜{w.endTime}</span>
                    {w.overtimeHours > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        +{w.overtimeHours}h
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 協力会社 */}
          {partnerRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">協力会社（{partnerRows.length}社）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {partnerRows.map(p => (
                  <div key={p.partnerCompanyId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{p.headcount}名</span>
                      <span className="text-sm text-gray-600">{p.startTime}〜{p.endTime}</span>
                      {p.overtimeHours > 0 && (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          +{p.overtimeHours}h
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 作業内容 */}
          {workDetail && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">作業内容</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{workDetail}</p>
              </CardContent>
            </Card>
          )}

          {/* 備考 */}
          {remarks && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">備考</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{remarks}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* フッター */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 safe-area-inset-bottom">
          <div className="flex gap-2">
            {contractType === '常用' && !hasSigned && existingReport && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/sign?report_id=${existingReport.id}`)}
              >
                <Pen className="mr-2 h-4 w-4" />
                サインをもらう
              </Button>
            )}
            <Button className="flex-1" disabled>
              <Check className="mr-2 h-4 w-4" />
              提出済み
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 編集モード（配置がない場合）
  if (!assignment) {
    return (
      <div className="flex flex-col">
        <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">この日の配置データがありません</p>
          <p className="text-gray-400 text-sm mt-2">配置が登録されている日付を選択してください</p>
        </div>
      </div>
    )
  }

  const selectedWorkerIds = workerRows.map(w => w.workerId)
  const availableWorkers = allWorkers.filter(w => !selectedWorkerIds.includes(w.id))
  const selectedPartnerIds = partnerRows.map(p => p.partnerCompanyId)
  const availablePartners = allPartners.filter(p => !selectedPartnerIds.includes(p.id))

  return (
    <div className="flex flex-col">
      {/* 日付ナビゲーション */}
      <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />

      <div className="space-y-4 p-4 pb-24">
        {/* 現場情報 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">現場情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{assignment?.site?.name || '未選択'}</span>
              <div className="flex items-center gap-2">
                <Badge>{contractType}</Badge>
                {shiftType !== '日勤のみ' && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                    {shiftType}
                  </Badge>
                )}
              </div>
            </div>
            {assignment?.site && (
              <div className="text-sm text-gray-500">
                発注元: {assignment.site.client_company?.name} / 支払者: {assignment.site.payer_company?.name}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>契約区分</Label>
                <Select value={contractType} onValueChange={(v) => setContractType(v as '常用' | '請負')}>
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
                <Select value={shiftType} onValueChange={(v) => handleShiftTypeChange(v as '日勤のみ' | '通し夜勤' | '夜勤のみ')}>
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
          </CardContent>
        </Card>

        {/* 作業時間 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {shiftType === '通し夜勤' ? '作業時間（日勤パート）' : '作業時間（現場全体）'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>開始</Label>
                <Input
                  type="time"
                  value={defaultWorkStart}
                  onChange={(e) => handleDefaultWorkStartChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>終了{shiftType === '夜勤のみ' && '（翌日）'}</Label>
                <Input
                  type="time"
                  value={defaultWorkEnd}
                  onChange={(e) => handleDefaultWorkEndChange(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 夜勤パート（通し夜勤の場合のみ） */}
        {shiftType === '通し夜勤' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">作業時間（夜勤パート）</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>開始</Label>
                  <Input
                    type="time"
                    value={nightWorkStart}
                    onChange={(e) => setNightWorkStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了（翌日）</Label>
                  <Input
                    type="time"
                    value={nightWorkEnd}
                    onChange={(e) => setNightWorkEnd(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 作業者（行表示） */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              作業者（{workerRows.length}名）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {workerRows.map(w => (
              <div key={w.workerId} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium min-w-0 truncate flex-shrink">{w.name}</span>
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <button
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
                      onClick={() => setEditingWorkerId(editingWorkerId === w.workerId ? null : w.workerId)}
                    >
                      <span>{w.startTime}〜{w.endTime}</span>
                      <Pencil className="h-3 w-3" />
                    </button>
                    {w.overtimeHours > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 whitespace-nowrap">
                        +{w.overtimeHours}h
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeWorker(w.workerId)}>
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
                {editingWorkerId === w.workerId && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1">
                      <Select value={parseTime(w.startTime).hour} onValueChange={(h) => h && updateWorkerStartTime(w.workerId, buildTime(h, parseTime(w.startTime).minute))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span>:</span>
                      <Select value={parseTime(w.startTime).minute} onValueChange={(m) => m && updateWorkerStartTime(w.workerId, buildTime(parseTime(w.startTime).hour, m))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <span className="text-gray-400">〜</span>
                    <div className="flex items-center gap-1">
                      <Select value={parseTime(w.endTime).hour} onValueChange={(h) => h && updateWorkerEndTime(w.workerId, buildTime(h, parseTime(w.endTime).minute))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span>:</span>
                      <Select value={parseTime(w.endTime).minute} onValueChange={(m) => m && updateWorkerEndTime(w.workerId, buildTime(parseTime(w.endTime).hour, m))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setEditingWorkerId(null)}>
                      <Check className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setWorkerModalOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              追加
            </Button>
          </CardContent>
        </Card>

        {/* 協力会社（行表示） */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              協力会社（{partnerRows.length}社）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {partnerRows.map(p => (
              <div key={p.partnerCompanyId} className="bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium min-w-0 truncate flex-shrink">{p.name}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updatePartnerHeadcount(p.partnerCompanyId, -1)} disabled={p.headcount <= 0}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-5 text-center text-sm font-medium">{p.headcount}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updatePartnerHeadcount(p.partnerCompanyId, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                    <button
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 whitespace-nowrap"
                      onClick={() => setEditingPartnerId(editingPartnerId === p.partnerCompanyId ? null : p.partnerCompanyId)}
                    >
                      <span>{p.startTime}〜{p.endTime}</span>
                      <Pencil className="h-3 w-3" />
                    </button>
                    {p.overtimeHours > 0 && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300 whitespace-nowrap">
                        +{p.overtimeHours}h
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePartner(p.partnerCompanyId)}>
                      <X className="h-4 w-4 text-gray-400" />
                    </Button>
                  </div>
                </div>
                {editingPartnerId === p.partnerCompanyId && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-1">
                      <Select value={parseTime(p.startTime).hour} onValueChange={(h) => h && updatePartnerStartTime(p.partnerCompanyId, buildTime(h, parseTime(p.startTime).minute))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span>:</span>
                      <Select value={parseTime(p.startTime).minute} onValueChange={(m) => m && updatePartnerStartTime(p.partnerCompanyId, buildTime(parseTime(p.startTime).hour, m))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <span className="text-gray-400">〜</span>
                    <div className="flex items-center gap-1">
                      <Select value={parseTime(p.endTime).hour} onValueChange={(h) => h && updatePartnerEndTime(p.partnerCompanyId, buildTime(h, parseTime(p.endTime).minute))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                      </Select>
                      <span>:</span>
                      <Select value={parseTime(p.endTime).minute} onValueChange={(m) => m && updatePartnerEndTime(p.partnerCompanyId, buildTime(parseTime(p.endTime).hour, m))}>
                        <SelectTrigger className="h-8 w-16 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" onClick={() => setEditingPartnerId(null)}>
                      <Check className="h-4 w-4 text-blue-600" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setPartnerModalOpen(true)}>
              <Plus className="mr-1 h-3 w-3" />
              協力会社を追加
            </Button>
          </CardContent>
        </Card>

        {/* 作業内容 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">作業内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {workCategories.map(cat => (
                <Badge
                  key={cat.id}
                  variant={selectedCategories.includes(cat.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat.id)}
                >
                  {selectedCategories.includes(cat.id) && <Check className="mr-1 h-3 w-3" />}
                  {cat.name}
                </Badge>
              ))}
            </div>
            <Textarea
              placeholder="作業内容の詳細"
              value={workDetail}
              onChange={(e) => setWorkDetail(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* 備考 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">備考</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="備考（任意）"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 safe-area-inset-bottom">
        <div className="flex gap-2">
          {contractType === '常用' && (
            <Button variant="outline" className="flex-1" onClick={handleGoToSign} disabled={submitting}>
              <Pen className="mr-2 h-4 w-4" />
              {submitting ? '送信中...' : 'サインをもらう'}
            </Button>
          )}
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '送信中...' : '日報を提出'}
          </Button>
        </div>
      </div>

      {/* 提出確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>日報を提出</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {hasSigned ? (
              <p>日報を提出してもよろしいですか？</p>
            ) : (
              <p className="text-amber-600">
                サインを入れていませんが、日報を提出してもよろしいですか？
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              {submitting ? '送信中...' : '提出する'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 作業者選択モーダル */}
      <Dialog open={workerModalOpen} onOpenChange={setWorkerModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>作業者を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {availableWorkers.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">追加できる作業者がいません</p>
            ) : (
              availableWorkers.map(worker => (
                <button
                  key={worker.id}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => { addWorker(worker); setWorkerModalOpen(false) }}
                >
                  {worker.name}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 協力会社選択モーダル */}
      <Dialog open={partnerModalOpen} onOpenChange={setPartnerModalOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>協力会社を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {availablePartners.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">追加できる協力会社がありません</p>
            ) : (
              availablePartners.map(partner => (
                <button
                  key={partner.id}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-50"
                  onClick={() => addPartner(partner)}
                >
                  {partner.name}
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
