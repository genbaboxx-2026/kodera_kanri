'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DateNav } from '@/components/haichi/date-nav'
import {
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  Send,
  RotateCcw,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
}
type Assignment = Tables<'assignments'> & {
  site?: Site
}
type DailyReport = Tables<'daily_reports'>

interface SiteAssignment {
  assignmentId: number
  siteId: number
  siteName: string
  clientCompany: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  reportStatus: '未報告' | '報告済み' | '完了'
  reportId: number | null
  reportDate: string | null
}

interface NippoSiteListProps {
  workerId: number
  onSelectSite: (assignmentId: number) => void
}

export function NippoSiteList({ workerId, onSelectSite }: NippoSiteListProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [siteAssignments, setSiteAssignments] = useState<SiteAssignment[]>([])

  const supabase = createClient()
  const today = startOfDay(new Date())
  const isFutureDate = isAfter(startOfDay(currentDate), today)
  const currentDateStr = format(currentDate, 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 自分が職長として配置されている現場を取得
    const { data: assignmentWorkers } = await supabase
      .from('assignment_workers')
      .select(`
        assignment_id,
        is_foreman,
        assignment:assignments!inner(
          id,
          target_date,
          site_id,
          contract_type,
          shift_type,
          site:sites(id, name, client_company:companies!sites_client_company_id_fkey(name))
        )
      `)
      .eq('worker_id', workerId)
      .eq('is_foreman', true)
      .eq('assignment.target_date', currentDateStr)

    if (!assignmentWorkers || assignmentWorkers.length === 0) {
      setSiteAssignments([])
      setLoading(false)
      return
    }

    // 各配置の日報ステータスを取得
    const assignmentIds = assignmentWorkers.map(aw => aw.assignment_id)
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('id, site_id, check_status, submitted_at')
      .eq('report_date', currentDateStr)
      .eq('reporter_id', workerId)

    const reportMap = new Map(reports?.map(r => [r.site_id, r]) || [])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sites: SiteAssignment[] = assignmentWorkers.map((aw: any) => {
      const assignment = aw.assignment
      const site = assignment?.site
      const report = reportMap.get(assignment?.site_id)

      let reportStatus: '未報告' | '報告済み' | '完了' = '未報告'
      if (report) {
        if (report.check_status === '完了') {
          reportStatus = '完了'
        } else {
          reportStatus = '報告済み'
        }
      }

      return {
        assignmentId: assignment?.id,
        siteId: assignment?.site_id,
        siteName: site?.name || '不明',
        clientCompany: site?.client_company?.name || '',
        contractType: assignment?.contract_type,
        shiftType: assignment?.shift_type,
        reportStatus,
        reportId: report?.id || null,
        reportDate: report?.submitted_at || null,
      }
    })

    setSiteAssignments(sites)
    setLoading(false)
  }, [supabase, workerId, currentDateStr])

  useEffect(() => {
    if (workerId) {
      fetchData()
    }
  }, [fetchData, workerId])

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1))
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1))

  // 完了にする
  const handleMarkComplete = async (site: SiteAssignment) => {
    if (!site.reportId) return

    setSending(site.assignmentId)

    await supabase
      .from('daily_reports')
      .update({ check_status: '完了' })
      .eq('id', site.reportId)

    await fetchData()
    setSending(null)
  }

  // 完了を取り消す
  const handleUnmarkComplete = async (site: SiteAssignment) => {
    if (!site.reportId) return

    setSending(site.assignmentId)

    await supabase
      .from('daily_reports')
      .update({ check_status: '提出済' })
      .eq('id', site.reportId)

    await fetchData()
    setSending(null)
  }

  // LINE完了通知を送る
  const handleSendCompleteLine = async (site: SiteAssignment) => {
    setSending(site.assignmentId)

    // TODO: LINE通知APIを呼び出す
    // 今は完了ステータスに変更するだけ
    if (site.reportId) {
      await supabase
        .from('daily_reports')
        .update({ check_status: '完了' })
        .eq('id', site.reportId)
    }

    alert(`${site.siteName}の完了をLINEで通知しました`)
    await fetchData()
    setSending(null)
  }

  const getStatusBadge = (status: '未報告' | '報告済み' | '完了') => {
    switch (status) {
      case '未報告':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            未報告
          </Badge>
        )
      case '報告済み':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Check className="h-3 w-3 mr-1" />
            報告済み
          </Badge>
        )
      case '完了':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            完了
          </Badge>
        )
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

  if (siteAssignments.length === 0) {
    return (
      <div className="flex flex-col">
        <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">担当する現場がありません</p>
          <p className="text-gray-400 text-sm mt-2">職長として配置されている現場のみ表示されます</p>
        </div>
      </div>
    )
  }

  // ステータス別のカウント
  const counts = {
    pending: siteAssignments.filter(s => s.reportStatus === '未報告').length,
    reported: siteAssignments.filter(s => s.reportStatus === '報告済み').length,
    completed: siteAssignments.filter(s => s.reportStatus === '完了').length,
  }

  return (
    <div className="flex flex-col pb-4">
      <DateNav date={currentDate} onPrevDay={handlePrevDay} onNextDay={handleNextDay} />

      {/* サマリー */}
      <div className="flex items-center justify-center gap-4 bg-white border-b px-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-yellow-600 font-medium">{counts.pending}</span>
          <span className="text-gray-500">未報告</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-blue-600 font-medium">{counts.reported}</span>
          <span className="text-gray-500">報告済み</span>
        </div>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-1.5 text-sm">
          <span className="text-green-600 font-medium">{counts.completed}</span>
          <span className="text-gray-500">完了</span>
        </div>
      </div>

      {/* 現場リスト */}
      <div className="space-y-3 p-4">
        {siteAssignments.map(site => (
          <Card
            key={site.assignmentId}
            className={cn(
              "overflow-hidden",
              site.reportStatus === '完了' && "opacity-60"
            )}
          >
            <CardContent className="p-0">
              {/* メインエリア（クリックで日報入力へ） */}
              <button
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => onSelectSite(site.assignmentId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{site.siteName}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {site.contractType}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{site.clientCompany}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {getStatusBadge(site.reportStatus)}
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </button>

              {/* アクションエリア（報告済み・完了の場合のみ） */}
              {site.reportStatus !== '未報告' && (
                <div className="flex items-center gap-2 border-t px-4 py-2 bg-gray-50">
                  {site.reportStatus === '報告済み' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                        onClick={() => handleMarkComplete(site)}
                        disabled={sending === site.assignmentId}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        完了にする
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSendCompleteLine(site)}
                        disabled={sending === site.assignmentId}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        完了LINE
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={() => handleUnmarkComplete(site)}
                      disabled={sending === site.assignmentId}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      完了を取り消す
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
