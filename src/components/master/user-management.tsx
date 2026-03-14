'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  role: '管理者' | '現場スタッフ' | '作業員'
  display_name: string | null
  created_at: string
}

export function UserManagement() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // モーダル状態
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // フォームデータ
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '現場スタッフ' as '管理者' | '現場スタッフ' | '作業員',
    display_name: '',
  })

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)

    // APIからユーザー一覧を取得
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (data.users) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      role: '現場スタッフ',
      display_name: '',
    })
  }

  const handleAddUser = async () => {
    if (!formData.email || !formData.password) {
      alert('メールアドレスとパスワードは必須です')
      return
    }

    if (formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          display_name: formData.display_name || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'ユーザーの作成に失敗しました')
        setSaving(false)
        return
      }

      resetForm()
      setAddModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error adding user:', error)
      alert('ユーザーの作成に失敗しました')
    }

    setSaving(false)
  }

  const handleEditUser = async () => {
    if (!selectedUser) return

    setSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        role: formData.role,
        display_name: formData.display_name || null,
      })
      .eq('id', selectedUser.id)

    if (error) {
      console.error('Error updating user:', error)
      alert('更新に失敗しました')
      setSaving(false)
      return
    }

    setEditModalOpen(false)
    setSelectedUser(null)
    fetchData()
    setSaving(false)
  }

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`${user.email} を削除しますか？\nこの操作は取り消せません。`)) {
      return
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || '削除に失敗しました')
        return
      }

      fetchData()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('削除に失敗しました')
    }
  }

  const openEditModal = (user: UserProfile) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      display_name: user.display_name || '',
    })
    setEditModalOpen(true)
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case '管理者':
        return 'default'
      case '現場スタッフ':
        return 'secondary'
      case '作業員':
        return 'outline'
      default:
        return 'outline'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>ユーザー管理</CardTitle>
            <CardDescription>
              システムにアクセスできるユーザーを管理します（{users.length}名）
            </CardDescription>
          </div>
          <Button onClick={() => {
            resetForm()
            setAddModalOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            ユーザーを追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            ユーザーが登録されていません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ロール</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.display_name || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* ユーザー追加モーダル */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ユーザーを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                placeholder="example@kodera.co.jp"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                初期パスワード <span className="text-red-500">*</span>
              </Label>
              <Input
                type="password"
                placeholder="6文字以上"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                placeholder="山田 太郎"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>
                ロール <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as typeof formData.role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="管理者">管理者</SelectItem>
                  <SelectItem value="現場スタッフ">現場スタッフ</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={handleAddUser}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    作成中...
                  </>
                ) : (
                  '作成'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ユーザー編集モーダル */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ユーザーを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>メールアドレス</Label>
              <Input value={formData.email} disabled className="bg-gray-100" />
            </div>

            <div className="space-y-2">
              <Label>名前</Label>
              <Input
                placeholder="山田 太郎"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>ロール</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as typeof formData.role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="管理者">管理者</SelectItem>
                  <SelectItem value="現場スタッフ">現場スタッフ</SelectItem>
                </SelectContent>
              </Select>
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
                onClick={handleEditUser}
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
    </Card>
  )
}
