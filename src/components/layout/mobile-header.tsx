'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronLeft } from 'lucide-react'

const pageTitles: Record<string, string> = {
  '/': 'ホーム',
  '/haichi': '配置入力',
  '/nippo': '日報',
  '/sign': '手書きサイン',
}

// 戻るボタンを非表示にするパス
const hideBackButtonPaths = ['/']

// ヘッダー自体を非表示にするパス（独自ヘッダーを持つページ）
const hideHeaderPaths = ['/nippo']

export function MobileHeader() {
  const pathname = usePathname()

  // nippoは独自にヘッダーを管理するため非表示
  if (hideHeaderPaths.includes(pathname)) {
    return null
  }

  const title = pageTitles[pathname] || '小寺工務店'
  const hideBackButton = hideBackButtonPaths.includes(pathname)

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="flex h-14 items-center px-4">
        <Link
          href="/"
          className={cn(
            'flex items-center text-gray-600 hover:text-gray-900',
            hideBackButton && 'invisible'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold">{title}</h1>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>
    </header>
  )
}
