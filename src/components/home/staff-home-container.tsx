'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ClipboardList, ChevronRight, Search, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
  payer_company?: Tables<'companies'>
}
type Assignment = Tables<'assignments'> & {
  site?: Site
  workers?: (Tables<'assignment_workers'> & { worker?: Tables<'workers'> })[]
}
type DailyReport = Tables<'daily_reports'>

interface TodayAssignment {
  assignmentId: number
  assignmentWorkerId: number
  siteId: number
  siteName: string
  clientCompanyName: string
  contractType: '常用' | '請負'
  shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
  shift: '日勤' | '夜勤'
  isReportSubmitted: boolean
}

interface StaffHomeContainerProps {
  userId: string
  workerId: number | null
  displayName: string
}

export function StaffHomeContainer({ userId, workerId, displayName }: StaffHomeContainerProps) {
  const router = useRouter()
  const supabase = createClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<TodayAssignment[]>([])
  const [sites, setSites] = useState<Site[]>([])

  // モーダル状態
  const [changeSiteModalOpen, setChangeSiteModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<TodayAssignment | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [conflictingWorker, setConflictingWorker] = useState<string | null>(null)
  const [pendingNewSite, setPendingNewSite] = useState<Site | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    if (!workerId) {
      setLoading(false)
      return
    }

    setLoading(true)

    // 本日の配置を取得（自分が職長として含まれているもの）
    const { data: assignmentWorkers } = await supabase
      .from('assignment_workers')
      .select(`
        id,
        assignment_id,
        shift,
        is_foreman,
        assignment:assignments!inner(
          id,
          target_date,
          site_id,
          contract_type,
          shift_type,
          site:sites(
            id,
            name,
            client_company:companies!sites_client_company_id_fkey(name)
          )
        )
      `)
      .eq('worker_id', workerId)
      .eq('is_foreman', true)
      .eq('assignment.target_date', today)

    // 本日の日報提出状況を取得
    const { data: reports } = await supabase
      .from('daily_reports')
      .select('site_id')
      .eq('report_date', today)
      .eq('reporter_id', workerId)

    const submittedSiteIds = new Set(reports?.map(r => r.site_id) || [])

    // 配置データを整形
    const todayAssignments: TodayAssignment[] = (assignmentWorkers || []).map(aw => {
      const assignment = aw.assignment as unknown as Assignment
      const site = assignment?.site as unknown as Site
      return {
        assignmentId: assignment?.id || 0,
        assignmentWorkerId: aw.id,
        siteId: site?.id || 0,
        siteName: site?.name || '',
        clientCompanyName: (site?.client_company as { name?: string })?.name || '',
        contractType: assignment?.contract_type || '常用',
        shiftType: assignment?.shift_type || '日勤のみ',
        shift: aw.shift,
        isReportSubmitted: submittedSiteIds.has(site?.id || 0),
      }
    })

    setAssignments(todayAssignments)

    // 現場マスター取得（変更用）
    const { data: sitesData } = await supabase
      .from('sites')
      .select(`
        *,
        client_company:companies!sites_client_company_id_fkey(*),
        payer_company:companies!sites_payer_company_id_fkey(*)
      `)
      .eq('status', '稼働中')
      .order('name')

    if (sitesData) setSites(sitesData as Site[])

    setLoading(false)
  }, [supabase, workerId, today])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCardClick = (assignment: TodayAssignment) => {
    router.push(`/nippo?date=${today}&assignment_id=${assignment.assignmentId}`)
  }

  const handleChangeSite = (assignment: TodayAssignment) => {
    setSelectedAssignment(assignment)
    setSearchQuery('')
    setChangeSiteModalOpen(true)
  }

  const handleSelectSite = async (newSite: Site) => {
    if (!selectedAssignment || !workerId) return

    // 変更先の現場に既に配置があるか確認
    const { data: existingAssignment } = await supabase
      .from('assignments')
      .select(`
        id,
        workers:assignment_workers(
          is_foreman,
          worker:workers(id, name, role)
        )
      `)
      .eq('target_date', today)
      .eq('site_id', newSite.id)
      .single()

    if (existingAssignment) {
      // 職長がいるか確認（is_foremanフラグで判定）
      const workers = existingAssignment.workers as unknown as { worker?: { id: number; name: string; role: string }; is_foreman?: boolean }[]
      const existingForeman = workers?.find(w => w.is_foreman)

      if (existingForeman && existingForeman.worker?.id !== workerId) {
        setConflictingWorker(existingForeman.worker?.name || '')
        setPendingNewSite(newSite)
        setConfirmModalOpen(true)
        return
      }
    }

    await executeChangeSite(newSite)
  }

  const executeChangeSite = async (newSite: Site) => {
    if (!selectedAssignment || !workerId) return

    setSaving(true)

    // 変更先の現場の配置を取得または作成
    let { data: targetAssignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('target_date', today)
      .eq('site_id', newSite.id)
      .single()

    if (!targetAssignment) {
      // 新しい配置を作成
      const { data: newAssignment } = await supabase
        .from('assignments')
        .insert({
          target_date: today,
          site_id: newSite.id,
          client_company_id: newSite.client_company_id,
          payer_company_id: newSite.payer_company_id,
          contract_type: newSite.default_contract_type || '常用',
          shift_type: '日勤のみ',
          created_by: userId,
        })
        .select()
        .single()

      targetAssignment = newAssignment
    }

    if (targetAssignment) {
      // assignment_workerのassignment_idを更新
      await supabase
        .from('assignment_workers')
        .update({ assignment_id: targetAssignment.id })
        .eq('id', selectedAssignment.assignmentWorkerId)
    }

    setSaving(false)
    setChangeSiteModalOpen(false)
    setConfirmModalOpen(false)
    setSelectedAssignment(null)
    setPendingNewSite(null)
    setConflictingWorker(null)
    fetchData()
  }

  const filteredSites = sites.filter(site => {
    if (searchQuery) {
      return site.name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const getShiftTime = (shiftType: string, shift: string) => {
    if (shiftType === '夜勤のみ' || shift === '夜勤') {
      return '22:00 〜 06:00'
    }
    if (shiftType === '通し夜勤') {
      return '08:00 〜 06:00'
    }
    return '08:00 〜 17:00'
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">読み込み中...</div>
  }

  return (
    <div className="flex flex-col pb-24">
      {/* ヘッダー */}
      <div className="border-b bg-white px-4 py-4">
        <p className="text-sm text-gray-500">おはようございます</p>
        <p className="text-xl font-bold">{displayName || 'ゲスト'}さん</p>
        <p className="mt-1 text-sm text-gray-500">
          {format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}
        </p>
      </div>

      {/* 今日の現場 */}
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-bold">今日の現場</h2>

        {!workerId ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <p>作業員情報が紐付けられていません</p>
              <p className="text-sm mt-1">管理者にお問い合わせください</p>
            </CardContent>
          </Card>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p>本日の配置はありません</p>
            </CardContent>
          </Card>
        ) : (
          assignments.map(assignment => (
            <Card
              key={assignment.assignmentWorkerId}
              className={cn(
                'overflow-hidden transition-shadow hover:shadow-md',
                assignment.isReportSubmitted && 'opacity-70'
              )}
            >
              <CardContent className="p-0">
                <button
                  className="w-full p-4 text-left"
                  onClick={() => handleCardClick(assignment)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{assignment.siteName}</span>
                        {assignment.isReportSubmitted && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            提出済み
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {assignment.clientCompanyName}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{assignment.contractType}</Badge>
                        <span className="text-sm text-gray-600">
                          {getShiftTime(assignment.shiftType, assignment.shift)}
                        </span>
                        {assignment.shift === '夜勤' && (
                          <Badge variant="outline" className="bg-blue-50">夜勤</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 mt-2" />
                  </div>
                </button>
                <div className="border-t px-4 py-2 bg-gray-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleChangeSite(assignment)
                    }}
                  >
                    現場を変更
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* フッター */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 safe-area-inset-bottom">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/haichi')}
        >
          <ClipboardList className="mr-2 h-4 w-4" />
          配置入力へ
        </Button>
      </div>

      {/* 現場変更モーダル */}
      <Dialog open={changeSiteModalOpen} onOpenChange={setChangeSiteModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>現場を変更</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="現場名で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
              {filteredSites.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">
                  現場が見つかりません
                </p>
              ) : (
                filteredSites.map(site => {
                  const isCurrent = site.id === selectedAssignment?.siteId
                  return (
                    <button
                      key={site.id}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left transition-colors',
                        isCurrent
                          ? 'bg-blue-50 text-blue-700'
                          : 'hover:bg-gray-50'
                      )}
                      onClick={() => !isCurrent && handleSelectSite(site)}
                      disabled={isCurrent || saving}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{site.name}</p>
                          <p className="text-sm text-gray-500">
                            {site.client_company?.name}
                          </p>
                        </div>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">現在</Badge>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 職長重複確認モーダル */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              確認
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              この現場には既に<strong>{conflictingWorker}</strong>さんが
              職長として割り当てられています。
            </p>
            <p className="mt-2">変更しますか？</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setConfirmModalOpen(false)
                setPendingNewSite(null)
                setConflictingWorker(null)
              }}
              disabled={saving}
            >
              キャンセル
            </Button>
            <Button
              className="flex-1"
              onClick={() => pendingNewSite && executeChangeSite(pendingNewSite)}
              disabled={saving}
            >
              {saving ? '変更中...' : 'はい'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
