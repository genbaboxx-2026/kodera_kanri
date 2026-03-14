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

type Department = Tables<'departments'>

export function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null)
  const [formData, setFormData] = useState({ name: '', display_order: '0' })

  const supabase = createClient()

  const fetchDepartments = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('departments').select('*').order('display_order')
    if (data) setDepartments(data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  const resetForm = () => {
    setFormData({ name: '', display_order: String(departments.length + 1) })
  }

  const openAddModal = () => {
    resetForm()
    setAddModalOpen(true)
  }

  const openEditModal = (dept: Department) => {
    setSelectedDepartment(dept)
    setFormData({
      name: dept.name,
      display_order: dept.display_order.toString(),
    })
    setEditModalOpen(true)
  }

  const handleAdd = async () => {
    if (!formData.name) {
      alert('所属名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('departments').insert({
      name: formData.name,
      display_order: parseInt(formData.display_order) || 0,
    })

    if (error) {
      if (error.code === '23505') {
        alert('この所属名は既に存在します')
      } else {
        alert('所属の追加に失敗しました')
      }
      setSaving(false)
      return
    }

    setAddModalOpen(false)
    fetchDepartments()
    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedDepartment) return

    if (!formData.name) {
      alert('所属名を入力してください')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('departments')
      .update({
        name: formData.name,
        display_order: parseInt(formData.display_order) || 0,
      })
      .eq('id', selectedDepartment.id)

    if (error) {
      if (error.code === '23505') {
        alert('この所属名は既に存在します')
      } else {
        alert('所属の更新に失敗しました')
      }
      setSaving(false)
      return
    }

    setEditModalOpen(false)
    setSelectedDepartment(null)
    fetchDepartments()
    setSaving(false)
  }

  const handleDelete = async (dept: Department) => {
    if (!confirm(`「${dept.name}」を削除しますか？\nこの所属に属する作業員がいる場合、削除できません。`)) {
      return
    }

    const { error } = await supabase.from('departments').delete().eq('id', dept.id)

    if (error) {
      alert('所属の削除に失敗しました。この所属に属する作業員がいないか確認してください。')
      return
    }

    fetchDepartments()
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>所属マスター</CardTitle>
              <CardDescription>作業員の所属を管理します（{departments.length}件）</CardDescription>
            </div>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              所属を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">所属が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">表示順</th>
                    <th className="text-left py-3 px-4 font-medium">所属名</th>
                    <th className="text-right py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">{dept.display_order}</td>
                      <td className="py-3 px-4 font-medium">{dept.name}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(dept)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(dept)}
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
            <DialogTitle>所属を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="仮設事業部"
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
            <DialogTitle>所属を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>所属名 <span className="text-red-500">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="仮設事業部"
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
