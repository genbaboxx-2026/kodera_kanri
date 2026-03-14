import { DezuraTable } from '@/components/dezura/dezura-table'

interface DezuraPageProps {
  searchParams: Promise<{ site?: string }>
}

export default async function DezuraPage({ searchParams }: DezuraPageProps) {
  const params = await searchParams
  const initialSiteFilter = params.site || ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">出面表</h1>
      </div>
      <DezuraTable initialSiteFilter={initialSiteFilter} />
    </div>
  )
}
