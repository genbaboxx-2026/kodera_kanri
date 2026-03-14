'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, addDays, subDays, isBefore, startOfDay } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DateNav } from './date-nav'
import { SummaryBar } from './summary-bar'
import { UnassignedAlert } from './unassigned-alert'
import { SiteCard } from './site-card'
import { LocationSection } from './location-section'
import { AddSiteModal } from './add-site-modal'
import { WorkerSelectModal } from './worker-select-modal'
import { PartnerSelectModal } from './partner-select-modal'
import { Plus, Copy, Send, Crown, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type Site = Tables<'sites'> & {
  client_company?: Tables<'companies'>
  payer_company?: Tables<'companies'>
}
type Assignment = Tables<'assignments'> & {
  site?: Site
  workers?: (Tables<'assignment_workers'> & { worker?: Worker })[]
  partners?: (Tables<'assignment_partners'> & { partner_company?: Tables<'partner_companies'> })[]
}
type LocationType = Tables<'location_types'>
type AssignmentLocation = Tables<'assignment_locations'> & {
  worker?: Worker
  location_type?: LocationType
}
type Company = Tables<'companies'>
type PartnerCompany = Tables<'partner_companies'>

interface HaichiContainerProps {
  userId: string
}

export function HaichiContainer({ userId }: HaichiContainerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  // マスターデータ
  const [workers, setWorkers] = useState<Worker[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [partnerCompanies, setPartnerCompanies] = useState<PartnerCompany[]>([])
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([])

  // 配置データ
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignmentLocations, setAssignmentLocations] = useState<AssignmentLocation[]>([])

  // モーダル状態
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false)
  const [workerModalState, setWorkerModalState] = useState<{
    open: boolean
    assignmentId: number | null
    siteId: number | null
  }>({ open: false, assignmentId: null, siteId: null })
  const [partnerModalState, setPartnerModalState] = useState<{
    open: boolean
    assignmentId: number | null
  }>({ open: false, assignmentId: null })
  const [foremanModalState, setForemanModalState] = useState<{
    open: boolean
    assignmentId: number | null
  }>({ open: false, assignmentId: null })

  const supabase = createClient()
  const today = startOfDay(new Date())
  const isPastDate = isBefore(startOfDay(selectedDate), today)
  const dateString = format(selectedDate, 'yyyy-MM-dd')

  // 配置済み作業員IDリスト
  const assignedWorkerIds = new Set([
    ...assignments.flatMap(a => a.workers?.map(w => w.worker_id) || []),
    ...assignmentLocations.map(al => al.worker_id),
  ])

  // 職長候補（全在籍作業員）
  const foremanCandidates = workers

  // サマリー計算
  const assignedCount = assignedWorkerIds.size
  const totalWorkers = workers.filter(w => w.status === '在籍').length
  const unassignedCount = totalWorkers - assignedCount
  const unassignedWorkers = workers.filter(
    w => w.status === '在籍' && !assignedWorkerIds.has(w.id)
  )

  const isPublished = assignments.some(a => a.published_at !== null)
  const confirmedCount = assignments.reduce(
    (sum, a) => sum + (a.workers?.filter(w => w.confirmed).length || 0),
    0
  )
  const unconfirmedCount = assignedCount - confirmedCount

  // データ取得
  const fetchMasterData = useCallback(async () => {
    const [workersRes, sitesRes, companiesRes, partnersRes, locTypesRes] = await Promise.all([
      supabase.from('workers').select('*').eq('status', '在籍').order('name_kana'),
      supabase.from('sites').select(`
        *,
        client_company:companies!sites_client_company_id_fkey(*),
        payer_company:companies!sites_payer_company_id_fkey(*)
      `).eq('status', '稼働中').order('name'),
      supabase.from('companies').select('*').order('name'),
      supabase.from('partner_companies').select('*').order('name'),
      supabase.from('location_types').select('*').order('display_order'),
    ])

    if (workersRes.data) setWorkers(workersRes.data)
    if (sitesRes.data) setSites(sitesRes.data as Site[])
    if (companiesRes.data) setCompanies(companiesRes.data)
    if (partnersRes.data) setPartnerCompanies(partnersRes.data)
    if (locTypesRes.data) setLocationTypes(locTypesRes.data)
  }, [supabase])

  const fetchAssignments = useCallback(async () => {
    setLoading(true)

    const [assignmentsRes, locationsRes] = await Promise.all([
      supabase.from('assignments').select(`
        *,
        site:sites(*, client_company:companies!sites_client_company_id_fkey(*), payer_company:companies!sites_payer_company_id_fkey(*)),
        workers:assignment_workers(*, worker:workers(*)),
        partners:assignment_partners(*, partner_company:partner_companies(*))
      `).eq('target_date', dateString),
      supabase.from('assignment_locations').select(`
        *,
        worker:workers(*),
        location_type:location_types(*)
      `).eq('target_date', dateString),
    ])

    if (assignmentsRes.data) setAssignments(assignmentsRes.data as Assignment[])
    if (locationsRes.data) setAssignmentLocations(locationsRes.data as AssignmentLocation[])

    setLoading(false)
  }, [supabase, dateString])

  useEffect(() => {
    fetchMasterData()
  }, [fetchMasterData])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // 初期ロード時に本日のデータがない場合は前日コピーを自動実行
  useEffect(() => {
    const autoCopyPrevDay = async () => {
      // 本日のデータがなく、初期ロードがまだの場合のみ実行
      if (!loading && !initialLoadDone && assignments.length === 0 && assignmentLocations.length === 0) {
        setInitialLoadDone(true)
        const copied = await executeCopyPrevDay(true)
        if (copied) {
          await fetchAssignments()
        }
      } else if (!loading && !initialLoadDone) {
        setInitialLoadDone(true)
      }
    }
    autoCopyPrevDay()
  }, [loading, initialLoadDone, assignments.length, assignmentLocations.length])

  // ハンドラ
  const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1))
  const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1))

  const handleAddWorkerToAssignment = async (
    assignmentId: number,
    workerId: number,
    shift: '日勤' | '夜勤'
  ) => {
    const { error } = await supabase.from('assignment_workers').insert({
      assignment_id: assignmentId,
      worker_id: workerId,
      shift,
    })

    if (!error) {
      fetchAssignments()
    }
  }

  const handleRemoveWorkerFromAssignment = async (assignmentWorkerId: number) => {
    const { error } = await supabase
      .from('assignment_workers')
      .delete()
      .eq('id', assignmentWorkerId)

    if (!error) {
      fetchAssignments()
    }
  }

  const handleAddPartnerToAssignment = async (
    assignmentId: number,
    partnerCompanyId: number,
    headcount: number
  ) => {
    const { error } = await supabase.from('assignment_partners').insert({
      assignment_id: assignmentId,
      partner_company_id: partnerCompanyId,
      headcount,
    })

    if (!error) {
      fetchAssignments()
    }
  }

  const handleCreateAndAddPartner = async (
    companyName: string,
    headcount: number
  ) => {
    if (!partnerModalState.assignmentId) return

    // 新規協力会社を作成
    const { data: newPartner, error: createError } = await supabase
      .from('partner_companies')
      .insert({ name: companyName })
      .select()
      .single()

    if (createError || !newPartner) {
      throw new Error('協力会社の作成に失敗しました')
    }

    // 配置に追加
    const { error: addError } = await supabase.from('assignment_partners').insert({
      assignment_id: partnerModalState.assignmentId,
      partner_company_id: newPartner.id,
      headcount,
    })

    if (addError) {
      throw new Error('配置への追加に失敗しました')
    }

    // マスターデータと配置を更新
    setPartnerCompanies(prev => [...prev, newPartner].sort((a, b) => a.name.localeCompare(b.name)))
    fetchAssignments()
    setPartnerModalState({ open: false, assignmentId: null })
  }

  const handleUpdatePartnerCount = async (partnerRecordId: number, headcount: number) => {
    if (headcount <= 0) {
      await supabase.from('assignment_partners').delete().eq('id', partnerRecordId)
    } else {
      await supabase
        .from('assignment_partners')
        .update({ headcount })
        .eq('id', partnerRecordId)
    }
    fetchAssignments()
  }

  const handleAddWorkerToLocation = async (
    locationTypeId: number,
    workerId: number
  ) => {
    const { error } = await supabase.from('assignment_locations').insert({
      target_date: dateString,
      worker_id: workerId,
      location_type_id: locationTypeId,
    })

    if (!error) {
      fetchAssignments()
    }
  }

  const handleRemoveWorkerFromLocation = async (locationId: number) => {
    const { error } = await supabase
      .from('assignment_locations')
      .delete()
      .eq('id', locationId)

    if (!error) {
      fetchAssignments()
    }
  }

  const handleAddSite = async (data: {
    siteId?: number
    siteName?: string
    clientCompanyId: number
    payerCompanyId: number
    contractType: '常用' | '請負'
    shiftType: '日勤のみ' | '通し夜勤' | '夜勤のみ'
    memo?: string
    foremanId?: number
  }) => {
    let siteId = data.siteId

    // フリー入力の場合は新規サイトを作成
    if (!siteId && data.siteName) {
      const { data: newSite, error } = await supabase
        .from('sites')
        .insert({
          name: data.siteName,
          client_company_id: data.clientCompanyId,
          payer_company_id: data.payerCompanyId,
          default_contract_type: data.contractType,
          status: '稼働中',
        })
        .select()
        .single()

      if (error || !newSite) {
        alert('現場の作成に失敗しました')
        return
      }
      siteId = newSite.id
    }

    if (!siteId) return

    // 配置レコードを作成
    const { data: newAssignment, error } = await supabase.from('assignments').insert({
      target_date: dateString,
      site_id: siteId,
      client_company_id: data.clientCompanyId,
      payer_company_id: data.payerCompanyId,
      contract_type: data.contractType,
      shift_type: data.shiftType,
      memo: data.memo || null,
      created_by: userId,
    }).select().single()

    if (error || !newAssignment) {
      alert('配置の追加に失敗しました')
      return
    }

    // 職長が選択されている場合は作業員として追加
    if (data.foremanId) {
      await supabase.from('assignment_workers').insert({
        assignment_id: newAssignment.id,
        worker_id: data.foremanId,
        shift: data.shiftType === '夜勤のみ' ? '夜勤' : '日勤',
        is_foreman: true,
      })
    }

    fetchAssignments()
    setIsAddSiteModalOpen(false)
  }

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('この現場配置を削除しますか？')) return

    await supabase.from('assignment_workers').delete().eq('assignment_id', assignmentId)
    await supabase.from('assignment_partners').delete().eq('assignment_id', assignmentId)
    await supabase.from('assignments').delete().eq('id', assignmentId)

    fetchAssignments()
  }

  const handleSetForeman = async (assignmentId: number, workerId: number) => {
    // 既存の職長フラグをすべて解除
    await supabase
      .from('assignment_workers')
      .update({ is_foreman: false })
      .eq('assignment_id', assignmentId)

    // 新しい職長を設定
    // まずこの作業員が既に配置されているか確認
    const { data: existingWorker } = await supabase
      .from('assignment_workers')
      .select('id')
      .eq('assignment_id', assignmentId)
      .eq('worker_id', workerId)
      .single()

    if (existingWorker) {
      // 既存の作業員を職長に設定
      await supabase
        .from('assignment_workers')
        .update({ is_foreman: true })
        .eq('id', existingWorker.id)
    } else {
      // 新しく作業員として追加して職長に設定
      const assignment = assignments.find(a => a.id === assignmentId)
      await supabase.from('assignment_workers').insert({
        assignment_id: assignmentId,
        worker_id: workerId,
        shift: assignment?.shift_type === '夜勤のみ' ? '夜勤' : '日勤',
        is_foreman: true,
      })
    }

    fetchAssignments()
    setForemanModalState({ open: false, assignmentId: null })
  }

  const executeCopyPrevDay = async (silent = false): Promise<boolean> => {
    if (!silent) setSaving(true)
    const prevDateString = format(subDays(selectedDate, 1), 'yyyy-MM-dd')

    // 前日の配置を取得
    const { data: prevAssignments } = await supabase
      .from('assignments')
      .select(`
        *,
        workers:assignment_workers(*),
        partners:assignment_partners(*)
      `)
      .eq('target_date', prevDateString)

    const { data: prevLocations } = await supabase
      .from('assignment_locations')
      .select('*')
      .eq('target_date', prevDateString)

    if (!prevAssignments?.length && !prevLocations?.length) {
      if (!silent) {
        alert('前日の配置データがありません')
        setSaving(false)
      }
      return false
    }

    // 既存の配置を削除
    for (const a of assignments) {
      await supabase.from('assignment_workers').delete().eq('assignment_id', a.id)
      await supabase.from('assignment_partners').delete().eq('assignment_id', a.id)
    }
    await supabase.from('assignments').delete().eq('target_date', dateString)
    await supabase.from('assignment_locations').delete().eq('target_date', dateString)

    // 前日の配置をコピー
    for (const prev of prevAssignments || []) {
      const { data: newAssignment } = await supabase
        .from('assignments')
        .insert({
          target_date: dateString,
          site_id: prev.site_id,
          client_company_id: prev.client_company_id,
          payer_company_id: prev.payer_company_id,
          contract_type: prev.contract_type,
          shift_type: prev.shift_type,
          memo: prev.memo,
          created_by: userId,
        })
        .select()
        .single()

      if (newAssignment) {
        // 作業員をコピー（is_foremanも含む）
        if (prev.workers?.length) {
          await supabase.from('assignment_workers').insert(
            prev.workers.map((w: Tables<'assignment_workers'> & { is_foreman?: boolean }) => ({
              assignment_id: newAssignment.id,
              worker_id: w.worker_id,
              shift: w.shift,
              is_foreman: w.is_foreman || false,
            }))
          )
        }
        // 協力会社をコピー
        if (prev.partners?.length) {
          await supabase.from('assignment_partners').insert(
            prev.partners.map((p: Tables<'assignment_partners'>) => ({
              assignment_id: newAssignment.id,
              partner_company_id: p.partner_company_id,
              headcount: p.headcount,
            }))
          )
        }
      }
    }

    // 場所配置をコピー
    if (prevLocations?.length) {
      await supabase.from('assignment_locations').insert(
        prevLocations.map(loc => ({
          target_date: dateString,
          worker_id: loc.worker_id,
          location_type_id: loc.location_type_id,
        }))
      )
    }

    if (!silent) setSaving(false)
    return true
  }

  const handleCopyPrevDay = async () => {
    if (!confirm('前日の配置をコピーしますか？\n既存の配置は上書きされます。')) return

    await executeCopyPrevDay()
    await fetchAssignments()
  }

  const handlePublish = async () => {
    if (assignments.length === 0) {
      alert('配信する配置がありません')
      return
    }

    if (unassignedCount > 0) {
      if (!confirm(`未配置の作業員が${unassignedCount}名います。\nこのまま配信しますか？`)) {
        return
      }
    }

    setSaving(true)

    try {
      const response = await fetch('/api/line/send-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDate: dateString,
          assignmentIds: assignments.map(a => a.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'LINE配信に失敗しました')
        setSaving(false)
        return
      }

      const { summary } = data
      let message = `LINE配信完了\n\n`
      message += `送信成功: ${summary.sent}名\n`
      if (summary.noLineId > 0) {
        message += `LINE未連携: ${summary.noLineId}名\n`
      }
      if (summary.errors > 0) {
        message += `エラー: ${summary.errors}名\n`
      }

      alert(message)
      await fetchAssignments()
    } catch (error) {
      console.error('LINE publish error:', error)
      alert('LINE配信中にエラーが発生しました')
    }

    setSaving(false)
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">読み込み中...</div>
  }

  return (
    <div className="flex flex-col pb-24">
      <DateNav
        date={selectedDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
      />

      <SummaryBar
        assignedCount={assignedCount}
        unassignedCount={unassignedCount}
        confirmedCount={confirmedCount}
        unconfirmedCount={unconfirmedCount}
        isPublished={isPublished}
      />

      {unassignedCount > 0 && (
        <UnassignedAlert workers={unassignedWorkers} />
      )}

      <div className="space-y-4 p-4">
        {/* 現場カード */}
        {assignments.map((assignment) => (
          <SiteCard
            key={assignment.id}
            assignmentId={assignment.id}
            siteName={assignment.site?.name || '不明'}
            clientCompany={assignment.site?.client_company?.name || ''}
            contractType={assignment.contract_type}
            shiftType={assignment.shift_type}
            workers={assignment.workers?.map(w => ({
              id: w.id,
              workerId: w.worker_id,
              name: w.worker?.name || '',
              shift: w.shift,
              isForeman: (w as Tables<'assignment_workers'> & { is_foreman?: boolean }).is_foreman || false,
            })) || []}
            partners={assignment.partners?.map(p => ({
              id: p.id,
              partnerCompanyId: p.partner_company_id,
              name: p.partner_company?.name || '',
              headcount: p.headcount,
            })) || []}
            isReadOnly={isPastDate}
            onAddWorker={() => setWorkerModalState({
              open: true,
              assignmentId: assignment.id,
              siteId: assignment.site_id,
            })}
            onRemoveWorker={handleRemoveWorkerFromAssignment}
            onUpdatePartnerCount={handleUpdatePartnerCount}
            onAddPartner={() => setPartnerModalState({
              open: true,
              assignmentId: assignment.id,
            })}
            onDelete={() => handleDeleteAssignment(assignment.id)}
            onChangeForeman={() => setForemanModalState({
              open: true,
              assignmentId: assignment.id,
            })}
          />
        ))}

        {/* 現場追加ボタン - 場所・その他の上に配置 */}
        {!isPastDate && (
          <button
            onClick={() => setIsAddSiteModalOpen(true)}
            className="w-full rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-gray-500 hover:border-gray-400 hover:text-gray-600"
          >
            <Plus className="mx-auto h-6 w-6" />
            <span className="text-sm">現場を追加</span>
          </button>
        )}

        {/* 場所カテゴリ */}
        <LocationSection
          locationTypes={locationTypes}
          assignmentLocations={assignmentLocations}
          workers={workers}
          assignedWorkerIds={assignedWorkerIds}
          isReadOnly={isPastDate}
          onAddWorker={handleAddWorkerToLocation}
          onRemoveWorker={handleRemoveWorkerFromLocation}
        />
      </div>

      {/* フッター */}
      {!isPastDate && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 safe-area-inset-bottom">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCopyPrevDay}
              disabled={saving}
            >
              <Copy className="mr-2 h-4 w-4" />
              前日コピー
            </Button>
            <Button
              className="flex-1"
              onClick={handlePublish}
              disabled={saving}
            >
              <Send className="mr-2 h-4 w-4" />
              LINE配信
            </Button>
          </div>
        </div>
      )}

      {/* モーダル */}
      <AddSiteModal
        open={isAddSiteModalOpen}
        onOpenChange={setIsAddSiteModalOpen}
        sites={sites}
        companies={companies}
        foremanCandidates={foremanCandidates}
        existingSiteIds={assignments.map(a => a.site_id)}
        onAdd={handleAddSite}
      />

      <WorkerSelectModal
        open={workerModalState.open}
        onOpenChange={(open) => setWorkerModalState({ ...workerModalState, open })}
        workers={workers}
        assignedWorkerIds={assignedWorkerIds}
        onSelect={(workerId, shift) => {
          if (workerModalState.assignmentId) {
            handleAddWorkerToAssignment(workerModalState.assignmentId, workerId, shift)
          }
          setWorkerModalState({ open: false, assignmentId: null, siteId: null })
        }}
      />

      <PartnerSelectModal
        open={partnerModalState.open}
        onOpenChange={(open) => setPartnerModalState({ ...partnerModalState, open })}
        partnerCompanies={partnerCompanies}
        existingPartnerIds={
          partnerModalState.assignmentId
            ? assignments
                .find(a => a.id === partnerModalState.assignmentId)
                ?.partners?.map(p => p.partner_company_id) || []
            : []
        }
        onSelect={(partnerCompanyId, headcount) => {
          if (partnerModalState.assignmentId) {
            handleAddPartnerToAssignment(
              partnerModalState.assignmentId,
              partnerCompanyId,
              headcount
            )
          }
          setPartnerModalState({ open: false, assignmentId: null })
        }}
        onCreateAndSelect={handleCreateAndAddPartner}
      />

      {/* 職長選択モーダル */}
      <Dialog
        open={foremanModalState.open}
        onOpenChange={(open) => setForemanModalState({ ...foremanModalState, open })}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-600" />
              職長を選択
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {foremanCandidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                職長の役職を持つ作業員がいません
              </p>
            ) : (
              foremanCandidates.map((worker) => {
                const currentAssignment = assignments.find(a => a.id === foremanModalState.assignmentId)
                const isCurrentForeman = currentAssignment?.workers?.some(
                  w => w.worker_id === worker.id && (w as Tables<'assignment_workers'> & { is_foreman?: boolean }).is_foreman
                )
                return (
                  <button
                    key={worker.id}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-left transition-colors',
                      isCurrentForeman
                        ? 'bg-amber-50 text-amber-700'
                        : 'hover:bg-gray-50'
                    )}
                    onClick={() => {
                      if (foremanModalState.assignmentId && !isCurrentForeman) {
                        handleSetForeman(foremanModalState.assignmentId, worker.id)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{worker.name}</span>
                      {isCurrentForeman && <Check className="h-4 w-4 text-amber-600" />}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
