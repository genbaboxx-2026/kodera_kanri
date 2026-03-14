'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Building2, ClipboardList, Calendar, Settings, User } from 'lucide-react'

const tabs = [
  { href: '/sites', label: '現場一覧', icon: Building2 },
  { href: '/dezura', label: '出面表', icon: ClipboardList },
  { href: '/attendance', label: '出勤表', icon: Calendar },
  { href: '/master', label: 'マスタ設定', icon: Settings },
  { href: '/mypage', label: 'マイページ', icon: User },
]

export function TabNavigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <span className="text-xl font-bold text-gray-900">小寺工務店</span>
          </div>
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const isActive = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
