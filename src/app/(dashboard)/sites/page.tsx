import { SiteListTable } from '@/components/sites/site-list-table'

export default function SitesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">現場一覧</h1>
      </div>
      <SiteListTable />
    </div>
  )
}
