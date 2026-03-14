'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { X, ExternalLink, Save } from 'lucide-react'
import type { Tables } from '@/types/database'

type Company = Tables<'companies'>
type Worker = Tables<'workers'>
type Site = Tables<'sites'> & {
  client_company?: Company
  payer_company?: Company
  default_foreman?: Worker
}

interface SiteDetailPanelProps {
  site: Site
  companies: Company[]
  foremanCandidates: Worker[]
  todayForemanName?: string
  onClose: () => void
  onUpdate: () => void
}

interface AssignmentSummary {
  totalCount: number
  nightCount: number
  partnerCount: number
}

export function SiteDetailPanel({ site, companies, foremanCandidates, todayForemanName, onClose, onUpdate }: SiteDetailPanelProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: site.name,
    construction_number: site.construction_number || '',
    client_company_id: site.client_company_id.toString(),
    payer_company_id: site.payer_company_id.toString(),
    start_date: site.start_date || '',
    end_date: site.end_date || '',
    default_contract_type: site.default_contract_type || '',
    default_foreman_id: site.default_foreman?.id?.toString() || '',
    memo: site.memo || '',
  })
  const [saving, setSaving] = useState(false)
  const [summary, setSummary] = useState<AssignmentSummary>({
    totalCount: 0,
    nightCount: 0,
    partnerCount: 0,
  })

  const supabase = createClient()

  useEffect(() => {
    fetchSummary()
  }, [site.id])

  useEffect(() => {
    // site が変わったらフォームデータをリセット
    setFormData({
      name: site.name,
      construction_number: site.construction_number || '',
      client_company_id: site.client_company_id.toString(),
      payer_company_id: site.payer_company_id.toString(),
      start_date: site.start_date || '',
      end_date: site.end_date || '',
      default_contract_type: site.default_contract_type || '',
      default_foreman_id: site.default_foreman?.id?.toString() || '',
      memo: site.memo || '',
    })
  }, [site])

  const fetchSummary = async () => {
    const today = new Date().toISOString().split('T')[0]

    // 本日の配置を取得
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, shift_type')
      .eq('site_id', site.id)
      .eq('target_date', today)

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map(a => a.id)

      // 作業員数
      const { count: workerCount } = await supabase
        .from('assignment_workers')
        .select('*', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds)

      // 夜勤作業員数
      const { count: nightCount } = await supabase
        .from('assignment_workers')
        .select('*', { count: 'exact', head: true })
        .in('assignment_id', assignmentIds)
        .eq('shift', '夜勤')

      // 協力会社数
      const { data: partners } = await supabase
        .from('assignment_partners')
        .select('partner_company_id')
        .in('assignment_id', assignmentIds)

      const uniquePartners = new Set(partners?.map(p => p.partner_company_id))

      setSummary({
        totalCount: workerCount || 0,
        nightCount: nightCount || 0,
        partnerCount: uniquePartners.size,
      })
    } else {
      setSummary({ totalCount: 0, nightCount: 0, partnerCount: 0 })
    }
  }

  const handleSave = async () => {
    setSaving(true)

    const { error } = await supabase
      .from('sites')
      .update({
        name: formData.name,
        construction_number: formData.construction_number || null,
        client_company_id: parseInt(formData.client_company_id),
        payer_company_id: parseInt(formData.payer_company_id),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        default_contract_type: formData.default_contract_type as '常用' | '請負' || null,
        default_foreman_id: formData.default_foreman_id ? parseInt(formData.default_foreman_id) : null,
        memo: formData.memo || null,
      })
      .eq('id', site.id)

    setSaving(false)

    if (error) {
      console.error('Error updating site:', error)
      alert('更新に失敗しました')
      return
    }

    onUpdate()
  }

  const handleViewDezura = () => {
    router.push(`/dezura?site=${site.id}`)
  }

  return (
    <Card className="w-96 shrink-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">現場詳細</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>現場名</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>工事番号</Label>
          <Input
            value={formData.construction_number}
            onChange={(e) => setFormData({ ...formData, construction_number: e.target.value })}
            placeholder="K-2026-XXX"
          />
        </div>

        <div className="space-y-2">
          <Label>発注元</Label>
          <Select
            value={formData.client_company_id}
            onValueChange={(value) => setFormData({ ...formData, client_company_id: value || '' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>支払者</Label>
          <Select
            value={formData.payer_company_id}
            onValueChange={(value) => setFormData({ ...formData, payer_company_id: value || '' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id.toString()}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>着工日</Label>
            <Input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>完工予定日</Label>
            <Input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>デフォルト契約区分</Label>
          <Select
            value={formData.default_contract_type}
            onValueChange={(value) => setFormData({ ...formData, default_contract_type: value || '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="常用">常用</SelectItem>
              <SelectItem value="請負">請負</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>デフォルト職長</Label>
          <Select
            value={formData.default_foreman_id}
            onValueChange={(value) => setFormData({ ...formData, default_foreman_id: value || '' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="選択" />
            </SelectTrigger>
            <SelectContent>
              {foremanCandidates.map((worker) => (
                <SelectItem key={worker.id} value={worker.id.toString()}>
                  {worker.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>備考</Label>
          <Textarea
            placeholder="備考（任意）"
            value={formData.memo}
            onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
          />
        </div>

        <Button className="w-full" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? '保存中...' : '変更を保存'}
        </Button>

        <Separator />

        {/* サマリー */}
        <div className="space-y-2">
          <h4 className="font-medium">本日の配置状況</h4>
          {todayForemanName && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              本日の職長: <span className="font-medium">{todayForemanName}</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-gray-500">配置人数</p>
              <p className="text-lg font-bold">{summary.totalCount}名</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-gray-500">夜勤</p>
              <p className="text-lg font-bold">{summary.nightCount}名</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2 text-center">
              <p className="text-gray-500">協力会社</p>
              <p className="text-lg font-bold">{summary.partnerCount}社</p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleViewDezura}>
          <ExternalLink className="mr-2 h-4 w-4" />
          この現場の出面表を見る
        </Button>
      </CardContent>
    </Card>
  )
}
