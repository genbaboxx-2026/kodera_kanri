import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignContainer } from '@/components/nippo/sign-container'

export default async function SignPage({
  searchParams,
}: {
  searchParams: Promise<{ report_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const reportId = params.report_id ? parseInt(params.report_id) : undefined

  if (!reportId) {
    redirect('/haichi')
  }

  // 日報情報を取得
  const { data: report } = await supabase
    .from('daily_reports')
    .select(`
      *,
      site:sites(*, client_company:companies!sites_client_company_id_fkey(*))
    `)
    .eq('id', reportId)
    .single()

  if (!report) {
    redirect('/haichi')
  }

  return (
    <main className="min-h-screen bg-white">
      <SignContainer
        reportId={reportId}
        siteName={report.site?.name || ''}
        clientCompanyName={report.site?.client_company?.name || ''}
        contractType={report.contract_type}
        reportDate={report.report_date}
        defaultSignerName={report.site?.client_company?.signer_name || ''}
      />
    </main>
  )
}
