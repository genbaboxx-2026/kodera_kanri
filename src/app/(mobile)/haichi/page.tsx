import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HaichiContainer } from '@/components/haichi/haichi-container'

export default async function HaichiPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <HaichiContainer userId={user.id} />
    </main>
  )
}
