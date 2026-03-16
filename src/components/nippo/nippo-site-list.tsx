'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ChevronRight,
  Check,
  Clock,
  AlertCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
}

interface SiteWithStatus {
  siteId: number
  siteName: string
  clientCompany: string
  contractType: '常用' | '請負'
  // 今日の配置ID（あれば）
  todayAssignmentId: number | null
  // 今日のステータス
  todayStatus: '未配置' | '未報告' | '報告済み' | '完了'
  // 最後に報告した日付
  lastReportedDate: string | null
}

interface NippoSiteListProps {
  workerId: number
  onSelectSite: (siteId: number) => void
}

export function NippoSiteList({ workerId, onSelectSite }: NippoSiteListProps) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<number | null>(null)
  const [sites, setSites] = useState<SiteWithStatus[]>([])
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [siteToComplete, setSiteToComplete] = useState<SiteWithStatus | null>(null)

  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    setLoading(true)

    // 自分が職長として配置されている現場を取得（過去30日分）
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd')

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
          site:sites(id, name, client_company:companies!sites_client_company_id_fkey(name))
        )
      `)
      .eq('worker_id', workerId)
      .eq('is_foreman', true)
      .gte('assignment.target_date', thirtyDaysAgo)
      .order('assignment(target_date)', { ascending: false })

    if (!assignmentWorkers || assignmentWorkers.length === 0) {
      setSites([])
      setLoading(false)
      return
    }

    // 現場ごとにグループ化
    const siteMap = new Map<number, {
      siteId: number
      siteName: string
      clientCompany: string
      contractType: '常用' | '請負'
      todayAssignmentId: number | null
      dates: string[]
    }>()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const aw of assignmentWorkers as any[]) {
      const assignment = aw.assignment
      const site = assignment?.site
      const siteId = assignment?.site_id

      if (!siteMap.has(siteId)) {
        siteMap.set(siteId, {
          siteId,
          siteName: site?.name || '不明',
          clientCompany: site?.client_company?.name || '',
          contractType: assignment?.contract_type,
          todayAssignmentId: null,
          dates: [],
        })
      }

      const siteData = siteMap.get(siteId)!
      siteData.dates.push(assignment.target_date)

      // 今日の配置があればセット
      if (assignment.target_date === today) {
        siteData.todayAssignmentId = assignment.id
      }
    }

    // 各現場の日報ステータスを取得
    const siteIds = Array.from(siteMap.keys())
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('id, site_id, report_date, check_status')
      .in('site_id', siteIds)
      .eq('reporter_id', workerId)
      .gte('report_date', thirtyDaysAgo)
      .order('report_date', { ascending: false })

    // 現場ごとに最新の報告日を取得
    const lastReportMap = new Map<number, { date: string; status: string }>()
    const todayReportMap = new Map<number, string>()

    for (const report of reports || []) {
      // 今日の報告
      if (report.report_date === today) {
        todayReportMap.set(report.site_id, report.check_status)
      }
      // 最新の報告日
      if (!lastReportMap.has(report.site_id)) {
        lastReportMap.set(report.site_id, { date: report.report_date, status: report.check_status })
      }
    }

    // 最終的なリストを作成
    const siteList: SiteWithStatus[] = []

    for (const [siteId, data] of siteMap) {
      const todayReport = todayReportMap.get(siteId)
      const lastReport = lastReportMap.get(siteId)

      let todayStatus: '未配置' | '未報告' | '報告済み' | '完了' = '未配置'
      if (data.todayAssignmentId) {
        if (todayReport === '確定') {
          todayStatus = '完了'
        } else if (todayReport) {
          todayStatus = '報告済み'
        } else {
          todayStatus = '未報告'
        }
      }

      siteList.push({
        siteId,
        siteName: data.siteName,
        clientCompany: data.clientCompany,
        contractType: data.contractType,
        todayAssignmentId: data.todayAssignmentId,
        todayStatus,
        lastReportedDate: lastReport?.date || null,
      })
    }

    // 今日の配置がある現場を上に、その中で未報告を上に
    siteList.sort((a, b) => {
      // 今日の配置がある方が上
      if (a.todayAssignmentId && !b.todayAssignmentId) return -1
      if (!a.todayAssignmentId && b.todayAssignmentId) return 1
      // 未報告が上
      if (a.todayStatus === '未報告' && b.todayStatus !== '未報告') return -1
      if (a.todayStatus !== '未報告' && b.todayStatus === '未報告') return 1
      return 0
    })

    setSites(siteList)
    setLoading(false)
  }, [supabase, workerId, today])

  useEffect(() => {
    if (workerId) {
      fetchData()
    }
  }, [fetchData, workerId])

  // 完了確認ダイアログを開く
  const openCompleteConfirm = (site: SiteWithStatus) => {
    setSiteToComplete(site)
    setConfirmDialogOpen(true)
  }

  // 完了にする
  const handleMarkComplete = async () => {
    if (!siteToComplete || !siteToComplete.todayAssignmentId) return

    setConfirmDialogOpen(false)
    setSending(siteToComplete.siteId)

    // 今日の日報を確定に（reporter_idは指定しない - サイトと日付で特定）
    const { error } = await supabase
      .from('daily_reports')
      .update({ check_status: '確定' })
      .eq('site_id', siteToComplete.siteId)
      .eq('report_date', today)

    if (error) {
      console.error('Error marking complete:', error)
      alert('完了に失敗しました')
      setSending(null)
      setSiteToComplete(null)
      return
    }

    await fetchData()
    setSending(null)
    setSiteToComplete(null)
    // 完了タブに移動
    setActiveTab('completed')
  }

  // 完了を取り消す
  const handleUnmarkComplete = async (site: SiteWithStatus) => {
    setSending(site.siteId)

    const { error } = await supabase
      .from('daily_reports')
      .update({ check_status: '提出済' })
      .eq('site_id', site.siteId)
      .eq('report_date', today)

    if (error) {
      console.error('Error unmarking complete:', error)
      alert('取り消しに失敗しました')
      setSending(null)
      return
    }

    await fetchData()
    setSending(null)
    // 対応中タブに移動
    setActiveTab('active')
  }


  const getStatusBadge = (status: '未配置' | '未報告' | '報告済み' | '完了') => {
    switch (status) {
      case '未配置':
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
            本日配置なし
          </Badge>
        )
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

  const formatLastReportDate = (dateStr: string | null): string => {
    if (!dateStr) return '報告なし'
    const date = new Date(dateStr)
    return `${format(date, 'M/d', { locale: ja })}まで報告済み`
  }

  // タブごとにサイトをフィルタリング
  const activeSites = sites.filter(site => site.todayStatus !== '完了')
  const completedSites = sites.filter(site => site.todayStatus === '完了')

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">読み込み中...</div>
    )
  }

  if (sites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500 text-lg">担当する現場がありません</p>
        <p className="text-gray-400 text-sm mt-2">職長として配置されている現場のみ表示されます</p>
      </div>
    )
  }

  const renderSiteCard = (site: SiteWithStatus) => (
    <Card
      key={site.siteId}
      className="overflow-hidden"
    >
      <CardContent className="p-0">
        {/* メインエリア（クリックで日報入力へ） */}
        <button
          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
          onClick={() => onSelectSite(site.siteId)}
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
              <p className="text-xs text-gray-400 mt-1">
                {formatLastReportDate(site.lastReportedDate)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {getStatusBadge(site.todayStatus)}
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </button>

        {/* アクションエリア（報告済み・完了の場合のみ） */}
        {site.todayAssignmentId && site.todayStatus !== '未報告' && site.todayStatus !== '未配置' && (
          <div className="flex items-center gap-2 border-t px-4 py-2 bg-gray-50">
            {site.todayStatus === '報告済み' ? (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => openCompleteConfirm(site)}
                disabled={sending === site.siteId}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                完了にする
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => handleUnmarkComplete(site)}
                disabled={sending === site.siteId}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                完了を取り消す
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'completed')} className="flex flex-col">
      <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
        <TabsTrigger value="active">
          対応中 {activeSites.length > 0 && `(${activeSites.length})`}
        </TabsTrigger>
        <TabsTrigger value="completed">
          完了 {completedSites.length > 0 && `(${completedSites.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-0">
        {activeSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mb-4" />
            <p className="text-gray-500 text-lg">すべて完了しました</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {activeSites.map(renderSiteCard)}
          </div>
        )}
      </TabsContent>

      <TabsContent value="completed" className="mt-0">
        {completedSites.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 text-lg">完了した現場はありません</p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {completedSites.map(renderSiteCard)}
          </div>
        )}
      </TabsContent>

      {/* 完了確認ダイアログ */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>完了確認</DialogTitle>
            <DialogDescription>
              {siteToComplete?.siteName}の日報を完了にしますか？
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialogOpen(false)}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleMarkComplete}
            >
              完了にする
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}
