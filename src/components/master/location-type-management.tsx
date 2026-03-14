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

type LocationType = Tables<'location_types'>

export function LocationTypeManagement() {
  const [locationTypes, setLocationTypes] = useState<LocationType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLocationType, setSelectedLocationType] = useState<LocationType | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    display_order: '0',
  })

  const supabase = createClient()

  const fetchLocationTypes = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('location_types').select('*').order('display_order')
    if (data) setLocationTypes(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLocationTypes()
  }, [fetchLocationTypes])

  const resetForm = () => {
    setFormData({
      name: '',
      display_order: String(locationTypes.length + 1),
    })
  }

  const openAddModal = () => {
    resetForm()
    setAddModalOpen(true)
  }

  const openEditModal = (locationType: LocationType) => {
    setSelectedLocationType(locationType)
    setFormData({
      name: locationType.name,
      display_order: locationType.display_order.toString(),
    })
    setEditModalOpen(true)
  }

  const handleAdd = async () => {
    if (!formData.name) {
      alert('区分名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('location_types').insert({
      name: formData.name,
      display_order: parseInt(formData.display_order) || 0,
    })

    if (error) {
      alert('勤務場所区分の追加に失敗しました')
      setSaving(false)
      return
    }

    setAddModalOpen(false)
    fetchLocationTypes()
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedLocationType) return

    if (!formData.name) {
      alert('区分名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('location_types')
      .update({
        name: formData.name,
        display_order: parseInt(formData.display_order) || 0,
      })
      .eq('id', selectedLocationType.id)

    if (error) {
      alert('勤務場所区分の更新に失敗しました')
      setSaving(false)
      return
    }

    setEditModalOpen(false)
    setSelectedLocationType(null)
    fetchLocationTypes()
    setSaving(false)
  }

  const handleDelete = async (locationType: LocationType) => {
    if (!confirm(`「${locationType.name}」を削除しますか？`)) {
      return
    }

    const { error } = await supabase.from('location_types').delete().eq('id', locationType.id)

    if (error) {
      alert('勤務場所区分の削除に失敗しました。この区分を参照しているデータがないか確認してください。')
      return
    }

    fetchLocationTypes()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>勤務場所区分マスター</CardTitle>
              <CardDescription>現場以外の勤務場所を定義します（{locationTypes.length}件）</CardDescription>
            </div>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              区分を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : locationTypes.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">勤務場所区分が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">表示順</th>
                    <th className="text-left py-3 px-4 font-medium">区分名</th>
                    <th className="text-right py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {locationTypes.map((loc) => (
                    <tr key={loc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{loc.display_order}</td>
                      <td className="py-3 px-4 font-medium">{loc.name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(loc)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(loc)}
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
            <DialogTitle>勤務場所区分を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>区分名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="本社"
              />
            </div>
            <div className="space-y-2">
              <Label>表示順</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                placeholder="1"
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
            <DialogTitle>勤務場所区分を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>区分名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="本社"
              />
            </div>
            <div className="space-y-2">
              <Label>表示順</Label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                placeholder="1"
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
