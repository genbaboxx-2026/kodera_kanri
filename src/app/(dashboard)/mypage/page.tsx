'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pencil, Check, X } from 'lucide-react'

interface Profile {
  id: string
  email: string
  role: '管理者' | '現場スタッフ'
  display_name: string | null
  phone: string | null
  line_user_id: string | null
  worker_id: number | null
}

// 電話番号フォーマット（表示用）
function formatPhone(phone: string | null): string {
  if (!phone) return '-'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

// 電話番号正規化（保存用）
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-ー−\(\)（）]/g, '')
}

export default function MyPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // 編集用の状態
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, worker:workers(id, phone, line_user_id)')
      .eq('id', user.id)
      .single()

    if (profileData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const worker = profileData.worker as any
      setProfile({
        id: profileData.id,
        email: user.email || '',
        role: profileData.role,
        display_name: profileData.display_name,
        phone: worker?.phone || null,
        line_user_id: worker?.line_user_id || null,
        worker_id: worker?.id || null,
      })
    }

    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const startEditing = () => {
    setEditDisplayName(profile?.display_name || '')
    setEditEmail(profile?.email || '')
    setEditPhone(profile?.phone || '')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditDisplayName('')
    setEditEmail('')
    setEditPhone('')
  }

  const saveProfile = async () => {
    if (!profile) return

    setSaving(true)

    try {
      // profiles テーブルの display_name を更新
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: editDisplayName || null })
        .eq('id', profile.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        alert('プロフィールの保存に失敗しました')
        setSaving(false)
        return
      }

      // workers テーブルの name, email, phone を更新（worker_idがある場合）
      if (profile.worker_id) {
        const normalizedPhone = normalizePhone(editPhone)
        const { error: workerError } = await supabase
          .from('workers')
          .update({
            name: editDisplayName || null,
            email: editEmail || null,
            phone: normalizedPhone || null,
          })
          .eq('id', profile.worker_id)

        if (workerError) {
          console.error('Error updating worker:', workerError)
          alert('作業員情報の保存に失敗しました')
          setSaving(false)
          return
        }
      }

      // メールアドレスが変更された場合、Supabase Authのメールも更新
      if (editEmail !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: editEmail,
        })

        if (authError) {
          console.error('Error updating auth email:', authError)
          alert('メールアドレスの変更に失敗しました: ' + authError.message)
          setSaving(false)
          return
        }

        alert('メールアドレスの変更確認メールを送信しました。新しいメールアドレスで確認してください。')
      }

      // 状態を更新
      setProfile({
        ...profile,
        display_name: editDisplayName || null,
        email: editEmail,
        phone: normalizePhone(editPhone) || null,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('保存に失敗しました')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>アカウント情報</CardTitle>
              <CardDescription>ログイン中のアカウント情報</CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" />
                編集
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  保存
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-1" />
                  キャンセル
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">名前</p>
            {isEditing ? (
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="名前を入力"
                className="max-w-xs mt-1"
              />
            ) : (
              <p className="font-medium">{profile?.display_name || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">メールアドレス</p>
            {isEditing ? (
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="メールアドレスを入力"
                className="max-w-xs mt-1"
              />
            ) : (
              <p className="font-medium">{profile?.email || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">電話番号</p>
            {isEditing ? (
              <Input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="09012345678"
                className="max-w-xs mt-1"
              />
            ) : (
              <p className="font-medium">{formatPhone(profile?.phone ?? null)}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">LINE連携</p>
            {profile?.line_user_id ? (
              <Badge variant="default" className="bg-green-500">連携済み</Badge>
            ) : (
              <Badge variant="secondary">未連携</Badge>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">ロール</p>
            <Badge variant={profile?.role === '管理者' ? 'default' : 'secondary'}>
              {profile?.role || '-'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>セキュリティ</CardTitle>
          <CardDescription>パスワード変更やログアウト</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">パスワードを変更</Button>
          <div>
            <Button variant="destructive" onClick={handleLogout}>
              ログアウト
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
