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
}

// 電話番号フォーマット
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

export default function MyPage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, worker:workers(phone, line_user_id)')
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
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditDisplayName('')
  }

  const saveDisplayName = async () => {
    if (!profile) return

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: editDisplayName || null })
      .eq('id', profile.id)

    if (error) {
      console.error('Error updating display name:', error)
      alert('保存に失敗しました')
    } else {
      setProfile({ ...profile, display_name: editDisplayName || null })
      setIsEditing(false)
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
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" />
                編集
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">名前</p>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="名前を入力"
                  className="max-w-xs"
                />
                <Button
                  size="sm"
                  onClick={saveDisplayName}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="font-medium">{profile?.display_name || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500">メールアドレス</p>
            <p className="font-medium">{profile?.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">電話番号</p>
            <p className="font-medium">{formatPhone(profile?.phone ?? null)}</p>
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
