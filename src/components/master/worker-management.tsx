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
import { Plus, Search, Loader2, Pencil, HelpCircle, Check, X, Smartphone, Shield, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import { PermissionHelpModal } from './permission-help-modal'
import type { Tables } from '@/types/database'

type Worker = Tables<'workers'>
type Department = Tables<'departments'>

type FormData = {
  name: string
  name_kana: string
  email: string
  password: string
  system_role: '' | '管理者' | '現場スタッフ'
  can_edit_haichi: boolean
  can_edit_nippo: boolean
  employment_type: '正社員' | '外国人技能実習生'
  department: string
  fixed_overtime_hours: string
  status: '在籍' | '退職'
}

const initialFormData: FormData = {
  name: '',
  name_kana: '',
  email: '',
  password: '',
  system_role: '',
  can_edit_haichi: false,
  can_edit_nippo: false,
  employment_type: '正社員',
  department: '',
  fixed_overtime_hours: '20',
  status: '在籍',
}

export function WorkerManagement() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [permissionHelpOpen, setPermissionHelpOpen] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [showAccessPreview, setShowAccessPreview] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [workersRes, departmentsRes] = await Promise.all([
      supabase.from('workers').select('*').order('name_kana'),
      supabase.from('departments').select('*').order('display_order'),
    ])
    if (workersRes.data) setWorkers(workersRes.data)
    if (departmentsRes.data) setDepartments(departmentsRes.data)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredWorkers = workers.filter(w =>
    w.name.includes(searchTerm) || w.name_kana.includes(searchTerm)
  )

  const resetForm = () => {
    setFormData({
      ...initialFormData,
      department: departments[0]?.name || '',
    })
  }

  const openAddModal = () => {
    resetForm()
    setAddModalOpen(true)
  }

  const openEditModal = (worker: Worker) => {
    setSelectedWorker(worker)
    setFormData({
      name: worker.name,
      name_kana: worker.name_kana,
      email: worker.email || '',
      password: '',
      system_role: worker.system_role || '',
      can_edit_haichi: worker.can_edit_haichi,
      can_edit_nippo: worker.can_edit_nippo,
      employment_type: worker.employment_type,
      department: worker.department || '',
      fixed_overtime_hours: worker.fixed_overtime_hours.toString(),
      status: worker.status,
    })
    setEditModalOpen(true)
  }

  // 権限変更時にチェックボックスの状態を連動させる
  const handleRoleChange = (newRole: '' | '管理者' | '現場スタッフ') => {
    if (newRole === '管理者') {
      setFormData({ ...formData, system_role: newRole, can_edit_haichi: true, can_edit_nippo: true })
    } else if (newRole === '') {
      setFormData({ ...formData, system_role: newRole, can_edit_haichi: false, can_edit_nippo: false })
    } else {
      // 現場スタッフに切り替え時はデフォルトでON
      setFormData({
        ...formData,
        system_role: newRole,
        can_edit_haichi: formData.system_role === '現場スタッフ' ? formData.can_edit_haichi : true,
        can_edit_nippo: formData.system_role === '現場スタッフ' ? formData.can_edit_nippo : true,
      })
    }
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.name_kana) {
      alert('氏名とカナは必須です')
      return
    }

    if (!formData.department) {
      alert('所属を選択してください')
      return
    }

    if (formData.email && !formData.password) {
      alert('メールアドレスを設定する場合は初期パスワードも入力してください')
      return
    }

    if (formData.email && formData.password && formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          name_kana: formData.name_kana,
          email: formData.email || null,
          password: formData.password || null,
          system_role: formData.system_role || null,
          can_edit_haichi: formData.system_role === '管理者' ? true : formData.can_edit_haichi,
          can_edit_nippo: formData.system_role === '管理者' ? true : formData.can_edit_nippo,
          employment_type: formData.employment_type,
          department: formData.department,
          fixed_overtime_hours: parseFloat(formData.fixed_overtime_hours) || 0,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || '作業員の登録に失敗しました')
        setSaving(false)
        return
      }

      setAddModalOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error adding worker:', error)
      alert('作業員の登録に失敗しました')
    }

    setSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedWorker) return

    if (!formData.name || !formData.name_kana) {
      alert('氏名とカナは必須です')
      return
    }

    if (!formData.department) {
      alert('所属を選択してください')
      return
    }

    const isNewEmail = formData.email && !selectedWorker.email
    if (isNewEmail && !formData.password) {
      alert('メールアドレスを新しく設定する場合は初期パスワードも入力してください')
      return
    }

    if (isNewEmail && formData.password && formData.password.length < 6) {
      alert('パスワードは6文字以上で入力してください')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('/api/workers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedWorker.id,
          name: formData.name,
          name_kana: formData.name_kana,
          email: formData.email || null,
          password: formData.password || null,
          system_role: formData.system_role || null,
          can_edit_haichi: formData.system_role === '管理者' ? true : formData.can_edit_haichi,
          can_edit_nippo: formData.system_role === '管理者' ? true : formData.can_edit_nippo,
          employment_type: formData.employment_type,
          department: formData.department,
          fixed_overtime_hours: parseFloat(formData.fixed_overtime_hours) || 0,
          status: formData.status,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || '作業員の更新に失敗しました')
        setSaving(false)
        return
      }

      setEditModalOpen(false)
      setSelectedWorker(null)
      fetchData()
    } catch (error) {
      console.error('Error updating worker:', error)
      alert('作業員の更新に失敗しました')
    }

    setSaving(false)
  }

  // 権限カードコンポーネント
  const RoleCard = ({
    role,
    label,
    description,
    icon: Icon
  }: {
    role: '' | '管理者' | '現場スタッフ'
    label: string
    description: string
    icon: React.ElementType
  }) => {
    const isSelected = formData.system_role === role
    return (
      <button
        type="button"
        onClick={() => handleRoleChange(role)}
        className={`flex-1 p-3 rounded-lg border-2 text-left transition-all ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className={`font-medium text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
            {label}
          </span>
        </div>
        <p className="text-xs text-gray-500">{description}</p>
      </button>
    )
  }

  // トグルスイッチコンポーネント
  const ToggleSwitch = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean
    onChange: (checked: boolean) => void
    disabled?: boolean
  }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )

  // アクセス可能な画面のプレビュー（アコーディオン）
  const AccessPreview = () => {
    const name = formData.name || '作業員'
    const isAdmin = formData.system_role === '管理者'
    const canLogin = formData.system_role !== ''

    const features = [
      { name: 'ホーム画面', on: canLogin },
      { name: '配置入力', on: canLogin && formData.can_edit_haichi },
      { name: '日報入力', on: canLogin && formData.can_edit_nippo },
      { name: 'マイページ', on: canLogin },
    ]

    if (!canLogin) {
      return (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">
            {name}さんはLINEでの配置確認のみ利用できます
          </p>
        </div>
      )
    }

    return (
      <div className="mt-3 pt-3 border-t">
        <button
          type="button"
          onClick={() => setShowAccessPreview(!showAccessPreview)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 w-full"
        >
          {showAccessPreview ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {name}さんがアクセスできる画面
        </button>
        {showAccessPreview && (
          <div className="flex flex-wrap gap-1 mt-2">
            {features.map((f) => (
              <span
                key={f.name}
                className={`text-xs px-2 py-0.5 rounded ${
                  f.on
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400 line-through'
                }`}
              >
                {f.name}
              </span>
            ))}
            {isAdmin && (
              <>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">現場一覧</span>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">出面表</span>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">マスタ設定</span>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // 機能権限ボックス
  const PermissionBox = () => {
    const noLogin = formData.system_role === ''

    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1 mb-3">
          <span className="text-sm font-medium">この人が使える機能</span>
          <button
            type="button"
            onClick={() => setPermissionHelpOpen(true)}
            className="hover:text-gray-600"
          >
            <HelpCircle className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <div className="space-y-3">
          {/* 配置入力 */}
          <div className="flex items-center justify-between">
            <span className="text-sm">配置入力</span>
            {noLogin ? (
              <span className="text-gray-400">-</span>
            ) : (
              <ToggleSwitch
                checked={formData.can_edit_haichi}
                onChange={(v) => setFormData({ ...formData, can_edit_haichi: v })}
              />
            )}
          </div>

          {/* 日報入力 */}
          <div className="flex items-center justify-between">
            <span className="text-sm">日報入力</span>
            {noLogin ? (
              <span className="text-gray-400">-</span>
            ) : (
              <ToggleSwitch
                checked={formData.can_edit_nippo}
                onChange={(v) => setFormData({ ...formData, can_edit_nippo: v })}
              />
            )}
          </div>
        </div>

        <AccessPreview />
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>作業員マスター</CardTitle>
              <CardDescription>全作業員の情報を管理します（{workers.length}名）</CardDescription>
            </div>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              作業員を追加
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="名前で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : filteredWorkers.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">作業員が登録されていません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-medium">氏名</th>
                    <th className="text-left py-3 px-4 font-medium">権限</th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        配置入力
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/mobile/haichi`
                            navigator.clipboard.writeText(url)
                            setCopiedUrl('haichi')
                            setTimeout(() => setCopiedUrl(null), 2000)
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="URLをコピー"
                        >
                          {copiedUrl === 'haichi' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        日報入力
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/mobile/nippo`
                            navigator.clipboard.writeText(url)
                            setCopiedUrl('nippo')
                            setTimeout(() => setCopiedUrl(null), 2000)
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="URLをコピー"
                        >
                          {copiedUrl === 'nippo' ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 font-medium">雇用区分</th>
                    <th className="text-left py-3 px-4 font-medium">所属</th>
                    <th className="text-left py-3 px-4 font-medium">固定残業</th>
                    <th className="text-left py-3 px-4 font-medium">状態</th>
                    <th className="text-right py-3 px-4 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkers.map((worker) => {
                    const isAdmin = worker.system_role === '管理者'
                    const canHaichi = isAdmin || worker.can_edit_haichi
                    const canNippo = isAdmin || worker.can_edit_nippo

                    return (
                      <tr key={worker.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{worker.name}</td>
                        <td className="py-3 px-4">
                          {worker.system_role ? (
                            <Badge variant={worker.system_role === '管理者' ? 'default' : 'secondary'}>
                              {worker.system_role}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {worker.system_role ? (
                            canHaichi ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {worker.system_role ? (
                            canNippo ? (
                              <Check className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-gray-300 mx-auto" />
                            )
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={worker.employment_type === '外国人技能実習生' ? 'border-orange-300 text-orange-700' : ''}>
                            {worker.employment_type === '外国人技能実習生' ? '実習生' : '正社員'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{worker.department}</td>
                        <td className="py-3 px-4">{worker.fixed_overtime_hours}h</td>
                        <td className="py-3 px-4">
                          <Badge variant={worker.status === '在籍' ? 'default' : 'secondary'}>
                            {worker.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditModal(worker)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 追加モーダル */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>作業員を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* 氏名・カナ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>氏名 <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田 太郎"
                />
              </div>
              <div className="space-y-2">
                <Label>カナ <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name_kana}
                  onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                  placeholder="ヤマダタロウ"
                />
              </div>
            </div>

            {/* ログインアカウント */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">ログインアカウント</p>

              {/* メールアドレス入力 */}
              <div className="space-y-2 mb-4">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@kodera.co.jp"
                />
              </div>

              {/* 権限カード選択 */}
              <div className="flex gap-2 mb-4">
                <RoleCard role="" label="ログイン不可" description="LINEのみ" icon={X} />
                <RoleCard role="現場スタッフ" label="現場スタッフ" description="スマホで操作" icon={Smartphone} />
                <RoleCard role="管理者" label="管理者" description="全機能" icon={Shield} />
              </div>

              {/* 初期パスワード（メールアドレスがある場合のみ） */}
              {formData.email && formData.system_role && (
                <div className="space-y-2">
                  <Label>初期パスワード <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="6文字以上"
                  />
                </div>
              )}
            </div>

            {/* 作業員情報 */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">作業員情報</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>雇用区分</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(v) => setFormData({ ...formData, employment_type: v as typeof formData.employment_type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="正社員">正社員</SelectItem>
                      <SelectItem value="外国人技能実習生">外国人技能実習生</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>所属 <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.department || ''}
                    onValueChange={(v) => setFormData({ ...formData, department: v ?? '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>固定残業時間</Label>
                  <Input
                    type="number"
                    value={formData.fixed_overtime_hours}
                    onChange={(e) => setFormData({ ...formData, fixed_overtime_hours: e.target.value })}
                    placeholder="20"
                  />
                </div>
              </div>
            </div>

            {/* この人が使える機能（一番下） */}
            <div className="border-t pt-4 mt-4">
              <PermissionBox />
            </div>

            <div className="flex gap-2 pt-4 border-t">
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
                    登録中...
                  </>
                ) : (
                  '登録'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 編集モーダル */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>作業員を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* 氏名・カナ */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>氏名 <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田 太郎"
                />
              </div>
              <div className="space-y-2">
                <Label>カナ <span className="text-red-500">*</span></Label>
                <Input
                  value={formData.name_kana}
                  onChange={(e) => setFormData({ ...formData, name_kana: e.target.value })}
                  placeholder="ヤマダタロウ"
                />
              </div>
            </div>

            {/* ログインアカウント */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">ログインアカウント</p>

              {/* メールアドレス入力 */}
              <div className="space-y-2 mb-4">
                <Label>メールアドレス</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="example@kodera.co.jp"
                  disabled={!!selectedWorker?.email}
                />
                {selectedWorker?.email && (
                  <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
                )}
              </div>

              {/* 権限カード選択 */}
              <div className="flex gap-2 mb-4">
                <RoleCard role="" label="ログイン不可" description="LINEのみ" icon={X} />
                <RoleCard role="現場スタッフ" label="現場スタッフ" description="スマホで操作" icon={Smartphone} />
                <RoleCard role="管理者" label="管理者" description="全機能" icon={Shield} />
              </div>

              {/* 初期パスワード（新しくメールアドレスを設定する場合のみ） */}
              {!selectedWorker?.email && formData.email && formData.system_role && (
                <div className="space-y-2">
                  <Label>初期パスワード <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="6文字以上"
                  />
                </div>
              )}
            </div>

            {/* 作業員情報 */}
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-3">作業員情報</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>雇用区分</Label>
                  <Select
                    value={formData.employment_type}
                    onValueChange={(v) => setFormData({ ...formData, employment_type: v as typeof formData.employment_type })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="正社員">正社員</SelectItem>
                      <SelectItem value="外国人技能実習生">外国人技能実習生</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>所属 <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.department || ''}
                    onValueChange={(v) => setFormData({ ...formData, department: v ?? '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>固定残業時間</Label>
                  <Input
                    type="number"
                    value={formData.fixed_overtime_hours}
                    onChange={(e) => setFormData({ ...formData, fixed_overtime_hours: e.target.value })}
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label>状態</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="在籍">在籍</SelectItem>
                      <SelectItem value="退職">退職</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* この人が使える機能（一番下） */}
            <div className="border-t pt-4 mt-4">
              <PermissionBox />
            </div>

            <div className="flex gap-2 pt-4 border-t">
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

      {/* 権限説明モーダル */}
      <PermissionHelpModal
        open={permissionHelpOpen}
        onOpenChange={setPermissionHelpOpen}
      />
    </>
  )
}
