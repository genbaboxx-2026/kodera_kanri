'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Tables } from '@/types/database'

type Company = Tables<'companies'>
type Worker = Tables<'workers'>

interface SiteAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companies: Company[]
  foremanCandidates: Worker[]
  onSuccess: () => void
}

export function SiteAddModal({ open, onOpenChange, companies, foremanCandidates, onSuccess }: SiteAddModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    client_company_id: '',
    payer_company_id: '',
    start_date: '',
    end_date: '',
    default_contract_type: '',
    default_foreman_id: '',
    memo: '',
  })
  const [saving, setSaving] = useState(false)
  const [nextConstructionNumber, setNextConstructionNumber] = useState('')

  const supabase = createClient()

  const generateNextConstructionNumber = async () => {
    const currentYear = new Date().getFullYear()
    const prefix = `K-${currentYear}-`

    const { data } = await supabase
      .from('sites')
      .select('construction_number')
      .like('construction_number', `${prefix}%`)
      .order('construction_number', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (data && data.length > 0 && data[0].construction_number) {
      const lastNumber = parseInt(data[0].construction_number.split('-')[2], 10)
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1
      }
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`
  }

  useEffect(() => {
    if (open) {
      generateNextConstructionNumber().then(setNextConstructionNumber)
    }
  }, [open])

  const resetForm = () => {
    setFormData({
      name: '',
      client_company_id: '',
      payer_company_id: '',
      start_date: '',
      end_date: '',
      default_contract_type: '',
      default_foreman_id: '',
      memo: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.client_company_id || !formData.payer_company_id) {
      alert('必須項目を入力してください')
      return
    }

    setSaving(true)

    const constructionNumber = await generateNextConstructionNumber()

    const { error } = await supabase.from('sites').insert({
      name: formData.name,
      construction_number: constructionNumber,
      client_company_id: parseInt(formData.client_company_id),
      payer_company_id: parseInt(formData.payer_company_id),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      default_contract_type: formData.default_contract_type as '常用' | '請負' || null,
      default_foreman_id: formData.default_foreman_id ? parseInt(formData.default_foreman_id) : null,
      memo: formData.memo || null,
      status: '稼働中',
    })

    setSaving(false)

    if (error) {
      console.error('Error adding site:', error)
      alert('登録に失敗しました')
      return
    }

    resetForm()
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>現場を新規登録</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label>
              現場名 <span className="text-red-500">*</span>
            </Label>
            <Input
              placeholder="現場名を入力"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>工事番号（自動採番）</Label>
            <Input
              value={nextConstructionNumber}
              readOnly
              className="bg-gray-100"
            />
          </div>

          <div className="space-y-2">
            <Label>
              発注元 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.client_company_id}
              onValueChange={(value) => setFormData({ ...formData, client_company_id: value || '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選択">
                  {formData.client_company_id
                    ? companies.find((c) => c.id.toString() === formData.client_company_id)?.name
                    : '選択'}
                </SelectValue>
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
            <Label>
              支払者 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.payer_company_id}
              onValueChange={(value) => setFormData({ ...formData, payer_company_id: value || '' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="選択">
                  {formData.payer_company_id
                    ? companies.find((c) => c.id.toString() === formData.payer_company_id)?.name
                    : '選択'}
                </SelectValue>
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
            <Label>デフォルト職長（任意）</Label>
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

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? '登録中...' : '登録する'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
