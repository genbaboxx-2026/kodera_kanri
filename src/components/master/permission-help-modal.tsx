'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type PermissionHelpModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PermissionHelpModal({ open, onOpenChange }: PermissionHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>権限の説明</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 font-medium">機能</th>
                <th className="text-center py-3 px-3 font-medium">
                  <div>ログイン不可</div>
                  <div className="text-xs text-gray-500 font-normal">一般作業員・実習生</div>
                </th>
                <th className="text-center py-3 px-3 font-medium">
                  <div>現場スタッフ</div>
                  <div className="text-xs text-gray-500 font-normal">職長</div>
                </th>
                <th className="text-center py-3 px-3 font-medium">
                  <div>管理者</div>
                  <div className="text-xs text-gray-500 font-normal">経理・社長</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {/* スマホ画面 */}
              <tr className="bg-gray-50">
                <td colSpan={4} className="py-2 px-3 font-medium text-gray-600">スマホ画面</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">ホーム画面</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">配置入力</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-blue-600">ON / OFF 切替可</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">日報入力</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-blue-600">ON / OFF 切替可</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">手書きサイン</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-blue-600">日報ONなら自動ON</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>

              {/* PC画面 */}
              <tr className="bg-gray-50">
                <td colSpan={4} className="py-2 px-3 font-medium text-gray-600">PC画面</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">現場一覧</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">出面表</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">出勤表</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">マスタ設定</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">マイページ</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
              </tr>

              {/* LINE */}
              <tr className="bg-gray-50">
                <td colSpan={4} className="py-2 px-3 font-medium text-gray-600">LINE</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 px-3">配置確認ボタン</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
                <td className="py-2 px-3 text-center text-green-600">常にON</td>
                <td className="py-2 px-3 text-center text-gray-400">-</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 凡例 */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>常にON（変更不可）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>管理者がON/OFF切替可</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400"></span>
            <span>アクセス不可</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
