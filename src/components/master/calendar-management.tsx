'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { Tables } from '@/types/database'

type CompanyCalendar = Tables<'company_calendar'>
type DayType = '出勤日' | '法定休日' | '所定休日'

// 日本の祝日（2024-2026年）
const JAPAN_HOLIDAYS: Record<string, string> = {
  '2024-01-01': '元日',
  '2024-01-08': '成人の日',
  '2024-02-11': '建国記念の日',
  '2024-02-12': '振替休日',
  '2024-02-23': '天皇誕生日',
  '2024-03-20': '春分の日',
  '2024-04-29': '昭和の日',
  '2024-05-03': '憲法記念日',
  '2024-05-04': 'みどりの日',
  '2024-05-05': 'こどもの日',
  '2024-05-06': '振替休日',
  '2024-07-15': '海の日',
  '2024-08-11': '山の日',
  '2024-08-12': '振替休日',
  '2024-09-16': '敬老の日',
  '2024-09-22': '秋分の日',
  '2024-09-23': '振替休日',
  '2024-10-14': 'スポーツの日',
  '2024-11-03': '文化の日',
  '2024-11-04': '振替休日',
  '2024-11-23': '勤労感謝の日',
  '2025-01-01': '元日',
  '2025-01-13': '成人の日',
  '2025-02-11': '建国記念の日',
  '2025-02-23': '天皇誕生日',
  '2025-02-24': '振替休日',
  '2025-03-20': '春分の日',
  '2025-04-29': '昭和の日',
  '2025-05-03': '憲法記念日',
  '2025-05-04': 'みどりの日',
  '2025-05-05': 'こどもの日',
  '2025-05-06': '振替休日',
  '2025-07-21': '海の日',
  '2025-08-11': '山の日',
  '2025-09-15': '敬老の日',
  '2025-09-23': '秋分の日',
  '2025-10-13': 'スポーツの日',
  '2025-11-03': '文化の日',
  '2025-11-23': '勤労感謝の日',
  '2025-11-24': '振替休日',
  '2026-01-01': '元日',
  '2026-01-12': '成人の日',
  '2026-02-11': '建国記念の日',
  '2026-02-23': '天皇誕生日',
  '2026-03-20': '春分の日',
  '2026-04-29': '昭和の日',
  '2026-05-03': '憲法記念日',
  '2026-05-04': 'みどりの日',
  '2026-05-05': 'こどもの日',
  '2026-05-06': '振替休日',
  '2026-07-20': '海の日',
  '2026-08-11': '山の日',
  '2026-09-21': '敬老の日',
  '2026-09-22': '国民の休日',
  '2026-09-23': '秋分の日',
  '2026-10-12': 'スポーツの日',
  '2026-11-03': '文化の日',
  '2026-11-23': '勤労感謝の日',
}

export function CalendarManagement() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calendarData, setCalendarData] = useState<CompanyCalendar[]>([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())

  const supabase = createClient()

  // 年度の選択肢（現在年-1 〜 現在年+2）
  const currentYear = new Date().getFullYear()
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // 月の日数を取得
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // 月の最初の曜日を取得（0=日曜）
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  // データ取得
  const fetchData = useCallback(async () => {
    setLoading(true)
    const startDate = `${selectedYear}-01-01`
    const endDate = `${selectedYear}-12-31`

    const { data } = await supabase
      .from('company_calendar')
      .select('*')
      .gte('calendar_date', startDate)
      .lte('calendar_date', endDate)
      .order('calendar_date')

    if (data) setCalendarData(data)
    setLoading(false)
  }, [supabase, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 日付のday_typeを取得
  const getDayType = (dateStr: string): DayType | null => {
    const record = calendarData.find(d => d.calendar_date === dateStr)
    return record?.day_type || null
  }

  // 日付クリック時の処理
  const handleDayClick = async (dateStr: string) => {
    const currentType = getDayType(dateStr)
    let newType: DayType

    // サイクル: 出勤日 → 法定休日 → 所定休日 → 出勤日
    if (currentType === '出勤日') {
      newType = '法定休日'
    } else if (currentType === '法定休日') {
      newType = '所定休日'
    } else {
      newType = '出勤日'
    }

    setSaving(true)
    const existing = calendarData.find(d => d.calendar_date === dateStr)

    if (existing) {
      await supabase
        .from('company_calendar')
        .update({ day_type: newType })
        .eq('id', existing.id)
    } else {
      await supabase.from('company_calendar').insert({
        fiscal_year: selectedYear,
        calendar_date: dateStr,
        day_type: newType,
      })
    }

    await fetchData()
    setSaving(false)
  }

  // 一括設定：土日を休日に
  const setWeekendHolidays = async () => {
    if (!confirm(`${selectedYear}年の土曜日を「所定休日」、日曜日を「法定休日」に設定しますか？`)) return

    setSaving(true)
    const records: { fiscal_year: number; calendar_date: string; day_type: DayType }[] = []

    for (let month = 0; month < 12; month++) {
      const daysInMonth = getDaysInMonth(selectedYear, month)
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(selectedYear, month, day)
        const dayOfWeek = date.getDay()
        const dateStr = `${selectedYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        if (dayOfWeek === 0) {
          // 日曜 → 法定休日
          records.push({ fiscal_year: selectedYear, calendar_date: dateStr, day_type: '法定休日' })
        } else if (dayOfWeek === 6) {
          // 土曜 → 所定休日
          records.push({ fiscal_year: selectedYear, calendar_date: dateStr, day_type: '所定休日' })
        }
      }
    }

    // 既存データを削除して新規挿入（土日のみ）
    const datesToUpdate = records.map(r => r.calendar_date)
    await supabase.from('company_calendar').delete().in('calendar_date', datesToUpdate)
    await supabase.from('company_calendar').insert(records)

    await fetchData()
    setSaving(false)
  }

  // 一括設定：祝日を法定休日に
  const setNationalHolidays = async () => {
    if (!confirm(`${selectedYear}年の祝日を「法定休日」に設定しますか？`)) return

    setSaving(true)
    const records: { fiscal_year: number; calendar_date: string; day_type: DayType }[] = []

    Object.keys(JAPAN_HOLIDAYS).forEach(dateStr => {
      if (dateStr.startsWith(String(selectedYear))) {
        records.push({ fiscal_year: selectedYear, calendar_date: dateStr, day_type: '法定休日' })
      }
    })

    if (records.length === 0) {
      alert('この年度の祝日データがありません')
      setSaving(false)
      return
    }

    const datesToUpdate = records.map(r => r.calendar_date)
    await supabase.from('company_calendar').delete().in('calendar_date', datesToUpdate)
    await supabase.from('company_calendar').insert(records)

    await fetchData()
    setSaving(false)
  }

  // 年間の集計
  const getYearSummary = () => {
    let workDays = 0
    let legalHolidays = 0
    let scheduledHolidays = 0

    calendarData.forEach(d => {
      if (d.day_type === '出勤日') workDays++
      else if (d.day_type === '法定休日') legalHolidays++
      else if (d.day_type === '所定休日') scheduledHolidays++
    })

    return { workDays, legalHolidays, scheduledHolidays }
  }

  const summary = getYearSummary()

  // カレンダーグリッドを生成
  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth)
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth)
    const days: (number | null)[] = []

    // 月初の空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    // 日付
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    const weeks: (number | null)[][] = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    // 最後の週を7日に
    if (weeks.length > 0) {
      const lastWeek = weeks[weeks.length - 1]
      while (lastWeek.length < 7) {
        lastWeek.push(null)
      }
    }

    return weeks
  }

  const weeks = renderCalendarGrid()
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>会社カレンダーマスター</CardTitle>
            <CardDescription>休日・出勤日を定義します</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={String(year)}>{year}年</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 年間集計 */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{selectedYear}年</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span>出勤日: <strong>{summary.workDays}</strong>日</span>
                <span>法定休日: <strong className="text-red-600">{summary.legalHolidays}</strong>日</span>
                <span>所定休日: <strong className="text-blue-600">{summary.scheduledHolidays}</strong>日</span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={setWeekendHolidays} disabled={saving}>
                  土日を休日に設定
                </Button>
                <Button variant="outline" size="sm" onClick={setNationalHolidays} disabled={saving}>
                  祝日を設定
                </Button>
              </div>
            </div>

            {/* 月選択 */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11)
                    setSelectedYear(selectedYear - 1)
                  } else {
                    setSelectedMonth(selectedMonth - 1)
                  }
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                前月
              </Button>
              <h3 className="text-lg font-medium">{selectedYear}年 {monthNames[selectedMonth]}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0)
                    setSelectedYear(selectedYear + 1)
                  } else {
                    setSelectedMonth(selectedMonth + 1)
                  }
                }}
              >
                翌月
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* 凡例 */}
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">クリックで切替:</span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-white border"></span>
                <span>出勤日</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-red-100 border border-red-300"></span>
                <span>法定休日</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></span>
                <span>所定休日</span>
              </div>
            </div>

            {/* カレンダーグリッド */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 bg-gray-50">
                {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                  <div
                    key={day}
                    className={`py-2 text-center text-sm font-medium ${
                      i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 border-t">
                  {week.map((day, dayIdx) => {
                    if (day === null) {
                      return <div key={dayIdx} className="h-16 bg-gray-50" />
                    }

                    const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayType = getDayType(dateStr)
                    const holiday = JAPAN_HOLIDAYS[dateStr]
                    const isWeekend = dayIdx === 0 || dayIdx === 6

                    let bgClass = 'bg-white hover:bg-gray-50'
                    if (dayType === '法定休日') {
                      bgClass = 'bg-red-100 hover:bg-red-200'
                    } else if (dayType === '所定休日') {
                      bgClass = 'bg-blue-100 hover:bg-blue-200'
                    }

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => handleDayClick(dateStr)}
                        disabled={saving}
                        className={`h-16 p-1 text-left border-r last:border-r-0 transition-colors ${bgClass} ${
                          saving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }`}
                      >
                        <div className={`text-sm font-medium ${
                          dayIdx === 0 ? 'text-red-600' : dayIdx === 6 ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {day}
                        </div>
                        {holiday && (
                          <div className="text-[10px] text-red-500 truncate">{holiday}</div>
                        )}
                        {dayType && (
                          <div className={`text-[10px] mt-1 ${
                            dayType === '法定休日' ? 'text-red-600' : dayType === '所定休日' ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            {dayType === '出勤日' ? '' : dayType === '法定休日' ? '法定' : '所定'}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* 説明 */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>・<strong>法定休日</strong>: 労働基準法で定められた週1日の休日（日曜日など）。この日の出勤は35%の割増</p>
              <p>・<strong>所定休日</strong>: 会社が定めた休日（土曜日など）。この日の出勤は25%の割増</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
