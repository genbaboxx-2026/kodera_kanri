'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isSaturday } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ChevronLeft, ChevronRight, Download, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type Assignment = Tables<'assignments'> & {
  site?: Tables<'sites'>
}
type DailyReport = Tables<'daily_reports'> & {
  site?: Tables<'sites'>
}

interface DayData {
  date: Date
  siteName: string
  contractType: string
  shiftType: string
  workStart: string
  workEnd: string
  overtimeHours: number
  nightHours: number
  note: string
}

interface AttendanceDetailProps {
  workerId: number
  onBack: () => void
}

export function AttendanceDetail({ workerId, onBack }: AttendanceDetailProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workerId.toString())
  const [workers, setWorkers] = useState<Worker[]>([])
  const [dayData, setDayData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const days = eachDayOfInterval({
    start: startOfMonth(selectedMonth),
    end: endOfMonth(selectedMonth),
  })

  const fetchWorkers = useCallback(async () => {
    const { data } = await supabase
      .from('workers')
      .select('*')
      .eq('status', '在籍')
      .order('name_kana')

    if (data) {
      setWorkers(data)
    }
  }, [supabase])

  const fetchAttendanceData = useCallback(async () => {
    if (!selectedWorkerId) return

    setLoading(true)
    const workerId = parseInt(selectedWorkerId)
    const startDate = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
    const endDate = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

    // 配置データを取得
    const { data: assignmentWorkers } = await supabase
      .from('assignment_workers')
      .select(`
        *,
        assignment:assignments(*, site:sites(*))
      `)
      .eq('worker_id', workerId)
      .gte('assignment.target_date', startDate)
      .lte('assignment.target_date', endDate)

    // 日報データを取得
    const { data: reportWorkers } = await supabase
      .from('report_workers')
      .select(`
        *,
        daily_report:daily_reports(*, site:sites(*))
      `)
      .eq('worker_id', workerId)
      .gte('daily_report.report_date', startDate)
      .lte('daily_report.report_date', endDate)

    // 日別データを構築
    const dataByDate: Record<string, DayData> = {}

    // 配置データから
    assignmentWorkers?.forEach(aw => {
      const assignment = aw.assignment as Assignment | undefined
      if (!assignment) return

      const dateKey = assignment.target_date
      dataByDate[dateKey] = {
        date: new Date(dateKey),
        siteName: assignment.site?.name || '',
        contractType: assignment.contract_type,
        shiftType: aw.shift,
        workStart: '08:00',
        workEnd: '17:00',
        overtimeHours: 0,
        nightHours: 0,
        note: assignment.shift_type === '通し夜勤' ? '通し夜勤(x1.5)' : '',
      }
    })

    // 日報データで上書き・補完
    reportWorkers?.forEach(rw => {
      const report = rw.daily_report as DailyReport | undefined
      if (!report) return

      const dateKey = report.report_date
      dataByDate[dateKey] = {
        ...dataByDate[dateKey],
        date: new Date(dateKey),
        siteName: report.site?.name || dataByDate[dateKey]?.siteName || '',
        contractType: report.contract_type,
        shiftType: '日勤',
        workStart: report.work_start,
        workEnd: report.work_end,
        overtimeHours: rw.overtime_hours || 0,
        nightHours: report.night_start ? 8 : 0, // 仮の計算
        note: dataByDate[dateKey]?.note || '',
      }
    })

    setDayData(Object.values(dataByDate).sort((a, b) => a.date.getTime() - b.date.getTime()))
    setLoading(false)
  }, [supabase, selectedWorkerId, selectedMonth])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  useEffect(() => {
    fetchAttendanceData()
  }, [fetchAttendanceData])

  const selectedWorker = workers.find(w => w.id.toString() === selectedWorkerId)

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))
  }

  const handlePrevWorker = () => {
    const currentIndex = workers.findIndex(w => w.id.toString() === selectedWorkerId)
    if (currentIndex > 0) {
      setSelectedWorkerId(workers[currentIndex - 1].id.toString())
    }
  }

  const handleNextWorker = () => {
    const currentIndex = workers.findIndex(w => w.id.toString() === selectedWorkerId)
    if (currentIndex < workers.length - 1) {
      setSelectedWorkerId(workers[currentIndex + 1].id.toString())
    }
  }

  const handleExportCSV = () => {
    if (!selectedWorker || dayData.length === 0) return

    const headers = ['日付', '曜日', '現場名', '区分', '開始', '終了', '残業h', '深夜h', '備考']
    const rows = dayData.map(d => [
      format(d.date, 'yyyy/MM/dd'),
      format(d.date, 'E', { locale: ja }),
      d.siteName,
      d.shiftType,
      d.workStart,
      d.workEnd,
      d.overtimeHours.toString(),
      d.nightHours.toString(),
      d.note,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `出勤表_${selectedWorker.name}_${format(selectedMonth, 'yyyyMM')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // サマリー計算
  const summary = {
    dayShiftDays: dayData.filter(d => d.shiftType === '日勤').length,
    nightShiftDays: dayData.filter(d => d.shiftType === '夜勤').length,
    totalHours: dayData.length * 8, // 仮の計算
    overtimeHours: dayData.reduce((sum, d) => sum + d.overtimeHours, 0),
    nightHours: dayData.reduce((sum, d) => sum + d.nightHours, 0),
    holidayDays: dayData.filter(d => isSunday(d.date) || isSaturday(d.date)).length,
  }

  if (workers.length === 0) {
    return <p className="text-center text-gray-500">作業員が登録されていません</p>
  }

  return (
    <div className="space-y-6">
      {/* 戻るリンク */}
      <button
        onClick={onBack}
        className="flex items-center text-blue-600 hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        一覧に戻る
      </button>

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

        <Select value={selectedWorkerId} onValueChange={(v) => setSelectedWorkerId(v || '')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="作業員を選択">
              {selectedWorker?.name || '読み込み中...'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {workers.map((worker) => (
              <SelectItem key={worker.id} value={worker.id.toString()}>
                {worker.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevWorker}
            disabled={workers.findIndex(w => w.id.toString() === selectedWorkerId) === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            前の人
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWorker}
            disabled={workers.findIndex(w => w.id.toString() === selectedWorkerId) === workers.length - 1}
          >
            次の人
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" className="ml-auto" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          CSV出力
        </Button>
      </div>

      {/* プロフィール */}
      {selectedWorker && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>作業員情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 text-sm">
              <div>
                <p className="text-gray-500">氏名</p>
                <p className="font-medium">{selectedWorker.name}</p>
              </div>
              <div>
                <p className="text-gray-500">雇用区分</p>
                <p className="font-medium">{selectedWorker.employment_type}</p>
              </div>
              <div>
                <p className="text-gray-500">権限</p>
                <p className="font-medium">{selectedWorker.system_role || '-'}</p>
              </div>
              <div>
                <p className="text-gray-500">所属</p>
                <p className="font-medium">{selectedWorker.department}</p>
              </div>
              <div>
                <p className="text-gray-500">固定残業時間</p>
                <p className="font-medium">{selectedWorker.fixed_overtime_hours}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">出勤日数（日勤）</p>
            <p className="text-2xl font-bold">{summary.dayShiftDays}日</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">出勤日数（夜勤）</p>
            <p className="text-2xl font-bold">{summary.nightShiftDays}日</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">総労働時間</p>
            <p className="text-2xl font-bold">{summary.totalHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">残業時間</p>
            <p className="text-2xl font-bold">{summary.overtimeHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">深夜時間</p>
            <p className="text-2xl font-bold">{summary.nightHours}h</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">休日出勤</p>
            <p className="text-2xl font-bold">{summary.holidayDays}日</p>
          </CardContent>
        </Card>
      </div>

      {/* 日別テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>日別出勤データ</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 py-4">読み込み中...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">日</TableHead>
                  <TableHead className="w-12 text-center">曜</TableHead>
                  <TableHead className="text-center">現場名</TableHead>
                  <TableHead className="text-center">区分</TableHead>
                  <TableHead className="text-center">開始</TableHead>
                  <TableHead className="text-center">終了</TableHead>
                  <TableHead className="text-center">残業h</TableHead>
                  <TableHead className="text-center">深夜h</TableHead>
                  <TableHead className="text-center">備考</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {days.map((day) => {
                  const data = dayData.find(d =>
                    format(d.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                  )
                  const isHoliday = isSunday(day)
                  const isSat = isSaturday(day)

                  return (
                    <TableRow
                      key={day.toISOString()}
                      className={cn(
                        isHoliday && 'bg-red-50',
                        isSat && 'bg-blue-50'
                      )}
                    >
                      <TableCell className="font-medium text-center">{format(day, 'd')}</TableCell>
                      <TableCell
                        className={cn(
                          'text-center',
                          isHoliday && 'text-red-600',
                          isSat && 'text-blue-600'
                        )}
                      >
                        {format(day, 'E', { locale: ja })}
                      </TableCell>
                      <TableCell className="text-center">{data?.siteName || '-'}</TableCell>
                      <TableCell className="text-center">{data?.shiftType || '-'}</TableCell>
                      <TableCell className="text-center">{data?.workStart || '-'}</TableCell>
                      <TableCell className="text-center">{data?.workEnd || '-'}</TableCell>
                      <TableCell className="text-center">
                        {data?.overtimeHours ? data.overtimeHours : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {data?.nightHours ? data.nightHours : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {data?.note || (isHoliday ? '法定休日' : isSat ? '所定休日' : '')}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
