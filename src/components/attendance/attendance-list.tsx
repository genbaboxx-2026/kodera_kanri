'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import { format, startOfMonth, endOfMonth, isSunday, isSaturday, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>

interface WorkerSummary {
  workerId: number
  name: string
  department: string
  dayShiftDays: number
  nightShiftDays: number
  totalHours: number
  overtimeHours: number
  nightHours: number
  holidayDays: number
}

interface AttendanceListProps {
  onWorkerClick: (workerId: number) => void
}

export function AttendanceList({ onWorkerClick }: AttendanceListProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [workers, setWorkers] = useState<Worker[]>([])
  const [summaries, setSummaries] = useState<WorkerSummary[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('status', '在籍')
      .order('department')
      .order('name_kana')

    if (data) {
      setWorkers(data)
    }
  }, [supabase])

  const fetchAttendanceData = useCallback(async () => {
    if (workers.length === 0) return

    setLoading(true)

    // 全作業員の配置データを取得
    const { data: assignmentWorkers } = await supabase
      .from('assignment_workers')
      .select(`
        *,
        assignment:assignments(*, site:sites(*))
      `)
      .gte('assignment.target_date', startDate)
      .lte('assignment.target_date', endDate)

    // 全作業員の日報データを取得
    const { data: reportWorkers } = await supabase
      .from('report_workers')
      .select(`
        *,
        daily_report:daily_reports(*, site:sites(*))
      `)
      .gte('daily_report.report_date', startDate)
      .lte('daily_report.report_date', endDate)

    // 作業員ごとにサマリーを計算
    const workerSummaries: WorkerSummary[] = workers.map(worker => {
      // この作業員のデータ抽出
      const workerAssignments = assignmentWorkers?.filter(aw => aw.worker_id === worker.id) || []
      const workerReports = reportWorkers?.filter(rw => rw.worker_id === worker.id) || []

      // 日別データを構築（日報が優先）
      const dateSet = new Map<string, {
        shiftType: string
        overtimeHours: number
        nightHours: number
        date: Date
      }>()

      workerAssignments.forEach(aw => {
        const assignment = aw.assignment as Tables<'assignments'> & { site?: Tables<'sites'> } | undefined
        if (!assignment) return

        const dateKey = assignment.target_date
        dateSet.set(dateKey, {
          shiftType: aw.shift,
          overtimeHours: 0,
          nightHours: assignment.shift_type === '通し夜勤' || assignment.shift_type === '夜勤のみ' ? 8 : 0,
          date: new Date(dateKey),
        })
      })

      workerReports.forEach(rw => {
        const report = rw.daily_report as Tables<'daily_reports'> & { site?: Tables<'sites'> } | undefined
        if (!report) return

        const dateKey = report.report_date
        dateSet.set(dateKey, {
          shiftType: report.night_start ? '夜勤' : '日勤',
          overtimeHours: rw.overtime_hours || 0,
          nightHours: report.night_start ? 8 : 0,
          date: new Date(dateKey),
        })
      })

      const dataArray = Array.from(dateSet.values())

      return {
        workerId: worker.id,
        name: worker.name,
        department: worker.department,
        dayShiftDays: dataArray.filter(d => d.shiftType === '日勤').length,
        nightShiftDays: dataArray.filter(d => d.shiftType === '夜勤').length,
        totalHours: dataArray.length * 8,
        overtimeHours: dataArray.reduce((sum, d) => sum + d.overtimeHours, 0),
        nightHours: dataArray.reduce((sum, d) => sum + d.nightHours, 0),
        holidayDays: dataArray.filter(d => isSunday(d.date) || isSaturday(d.date)).length,
      }
    })

    setSummaries(workerSummaries)
    setLoading(false)
  }, [supabase, workers, startDate, endDate])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  useEffect(() => {
    if (workers.length > 0) {
      fetchAttendanceData()
    }
  }, [workers, fetchAttendanceData])

  // 部門でグループ化
  const groupedSummaries = useMemo(() => {
    const groups: Record<string, WorkerSummary[]> = {}
    summaries.forEach(summary => {
      if (!groups[summary.department]) {
        groups[summary.department] = []
      }
      groups[summary.department].push(summary)
    })
    return groups
  }, [summaries])

  const handlePrevMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1)
    setSelectedMonth(newMonth)
    setStartDate(format(startOfMonth(newMonth), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(newMonth), 'yyyy-MM-dd'))
  }

  const handleNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1)
    setSelectedMonth(newMonth)
    setStartDate(format(startOfMonth(newMonth), 'yyyy-MM-dd'))
    setEndDate(format(endOfMonth(newMonth), 'yyyy-MM-dd'))
  }

  const handleExportCSV = () => {
    if (summaries.length === 0) return

    const headers = ['氏名', '所属', '出勤日数(日勤)', '出勤日数(夜勤)', '総労働時間', '残業時間', '深夜時間', '休日出勤']
    const rows = summaries.map(s => [
      s.name,
      s.department,
      s.dayShiftDays.toString(),
      s.nightShiftDays.toString(),
      s.totalHours.toString(),
      s.overtimeHours.toString(),
      s.nightHours.toString(),
      s.holidayDays.toString(),
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `出勤表_全員_${startDate}_${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // 合計計算
  const totals = useMemo(() => {
    return {
      dayShiftDays: summaries.reduce((sum, s) => sum + s.dayShiftDays, 0),
      nightShiftDays: summaries.reduce((sum, s) => sum + s.nightShiftDays, 0),
      totalHours: summaries.reduce((sum, s) => sum + s.totalHours, 0),
      overtimeHours: summaries.reduce((sum, s) => sum + s.overtimeHours, 0),
      nightHours: summaries.reduce((sum, s) => sum + s.nightHours, 0),
      holidayDays: summaries.reduce((sum, s) => sum + s.holidayDays, 0),
    }
  }, [summaries])

  return (
    <div className="space-y-6">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-4">
        {/* 月選択 */}
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

        {/* 期間指定 */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-gray-500">期間:</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-36"
          />
          <span className="text-gray-500">〜</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-36"
          />
        </div>

        <Button variant="outline" className="ml-auto" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          CSV出力（全員）
        </Button>
      </div>

      {/* 全員一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>出勤サマリー</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">読み込み中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>氏名</TableHead>
                  <TableHead className="text-center">出勤(日勤)</TableHead>
                  <TableHead className="text-center">出勤(夜勤)</TableHead>
                  <TableHead className="text-center">総労働h</TableHead>
                  <TableHead className="text-center">残業h</TableHead>
                  <TableHead className="text-center">深夜h</TableHead>
                  <TableHead className="text-center">休日出勤</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedSummaries).map(([department, departmentSummaries]) => (
                  <Fragment key={department}>
                    {/* 部門ヘッダー */}
                    <TableRow className="bg-gray-100">
                      <TableCell colSpan={7} className="font-medium text-gray-700">
                        {department}
                      </TableCell>
                    </TableRow>
                    {/* 部門内の作業員 */}
                    {departmentSummaries.map(summary => (
                      <TableRow key={summary.workerId}>
                        <TableCell>
                          <button
                            onClick={() => onWorkerClick(summary.workerId)}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {summary.name}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{summary.dayShiftDays}日</TableCell>
                        <TableCell className="text-center">{summary.nightShiftDays}日</TableCell>
                        <TableCell className="text-center">{summary.totalHours}h</TableCell>
                        <TableCell className="text-center">{summary.overtimeHours}h</TableCell>
                        <TableCell className="text-center">{summary.nightHours}h</TableCell>
                        <TableCell className="text-center">{summary.holidayDays}日</TableCell>
                      </TableRow>
                    ))}
                  </Fragment>
                ))}
                {/* 合計行 */}
                <TableRow className="bg-gray-50 font-medium">
                  <TableCell>合計</TableCell>
                  <TableCell className="text-center">{totals.dayShiftDays}日</TableCell>
                  <TableCell className="text-center">{totals.nightShiftDays}日</TableCell>
                  <TableCell className="text-center">{totals.totalHours}h</TableCell>
                  <TableCell className="text-center">{totals.overtimeHours}h</TableCell>
                  <TableCell className="text-center">{totals.nightHours}h</TableCell>
                  <TableCell className="text-center">{totals.holidayDays}日</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
