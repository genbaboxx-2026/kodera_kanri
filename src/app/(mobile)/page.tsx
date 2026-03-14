import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StaffHomeContainer } from '@/components/home/staff-home-container'

export default async function StaffHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // プロフィールからworker_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('worker_id, role, display_name')
    .eq('id', user.id)
    .single()

  // 管理者は /sites へリダイレクト
  if (profile?.role === '管理者') {
    redirect('/sites')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <StaffHomeContainer
        userId={user.id}
        workerId={profile?.worker_id || null}
        displayName={profile?.display_name || ''}
      />
    </main>
  )
}
