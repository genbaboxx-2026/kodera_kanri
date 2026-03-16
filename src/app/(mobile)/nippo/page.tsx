import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NippoMain } from '@/components/nippo/nippo-main'

export default async function NippoPage({
  searchParams,
}: {
  searchParams: Promise<{ assignment_id?: string; date?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーのworker_idを取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('worker_id')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const assignmentId = params.assignment_id ? parseInt(params.assignment_id) : undefined
  const date = params.date || new Date().toISOString().split('T')[0]

  return (
    <main className="min-h-screen bg-gray-50">
      <NippoMain
        userId={user.id}
        workerId={profile?.worker_id || null}
        initialAssignmentId={assignmentId}
        initialDate={date}
      />
    </main>
  )
}
