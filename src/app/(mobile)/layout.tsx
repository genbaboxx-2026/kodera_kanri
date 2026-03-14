import { MobileHeader } from '@/components/layout/mobile-header'

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader />
      <main className="pb-20">{children}</main>
    </div>
  )
}
