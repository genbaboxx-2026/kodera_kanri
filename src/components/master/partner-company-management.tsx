'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import type { Tables } from '@/types/database'

type PartnerCompany = Tables<'partner_companies'>

export function PartnerCompanyManagement() {
  const [partners, setPartners] = useState<PartnerCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState<PartnerCompany | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
  })

  const supabase = createClient()

  const fetchPartners = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('partner_companies').select('*').order('name')
    if (data) setPartners(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPartners()
  }, [fetchPartners])

  const resetForm = () => {
    setFormData({ name: '', contact: '' })
  }

  const openAddModal = () => {
    resetForm()
    setAddModalOpen(true)
  }

  const openEditModal = (partner: PartnerCompany) => {
    setSelectedPartner(partner)
    setFormData({
      name: partner.name,
      contact: partner.contact || '',
    })
    setEditModalOpen(true)
  }

  const handleAdd = async () => {
    if (!formData.name) {
      alert('会社名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('partner_companies').insert({
      name: formData.name,
      contact: formData.contact || null,
    })

    if (error) {
      alert('協力会社の追加に失敗しました')
      setSaving(false)
      return
    }

    setAddModalOpen(false)
    fetchPartners()
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedPartner) return

    if (!formData.name) {
      alert('会社名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('partner_companies')
      .update({
        name: formData.name,
        contact: formData.contact || null,
      })
      .eq('id', selectedPartner.id)

    if (error) {
      alert('協力会社の更新に失敗しました')
      setSaving(false)
      return
    }

    setEditModalOpen(false)
    setSelectedPartner(null)
    fetchPartners()
    setSaving(false)
  }

  const handleDelete = async (partner: PartnerCompany) => {
    if (!confirm(`「${partner.name}」を削除しますか？`)) {
      return
    }

    const { error } = await supabase.from('partner_companies').delete().eq('id', partner.id)

    if (error) {
      alert('協力会社の削除に失敗しました。この会社を参照しているデータがないか確認してください。')
      return
    }

    fetchPartners()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>協力会社マスター</CardTitle>
              <CardDescription>協力業者の情報を管理します（{partners.length}社）</CardDescription>
            </div>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              協力会社を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : partners.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">協力会社が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">会社名</th>
                    <th className="text-left py-3 px-4 font-medium">連絡先</th>
                    <th className="text-right py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{partner.name}</td>
                      <td className="py-3 px-4 text-gray-500">{partner.contact || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(partner)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(partner)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 追加モーダル */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>協力会社を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>会社名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="○○建設"
              />
            </div>
            <div className="space-y-2">
              <Label>連絡先</Label>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setAddModalOpen(false)}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleAdd}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    追加中...
                  </>
                ) : (
                  '追加'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編集モーダル */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>協力会社を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>会社名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="○○建設"
              />
            </div>
            <div className="space-y-2">
              <Label>連絡先</Label>
              <Input
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="090-1234-5678"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setEditModalOpen(false)}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={handleEdit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
