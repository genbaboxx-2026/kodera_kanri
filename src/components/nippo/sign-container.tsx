'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SignCanvas } from './sign-canvas'
import { RotateCcw, Check } from 'lucide-react'

interface SignContainerProps {
  reportId: number
  siteName: string
  clientCompanyName: string
  contractType: '常用' | '請負'
  reportDate: string
  defaultSignerName: string
}

export function SignContainer({
  reportId,
  siteName,
  clientCompanyName,
  contractType,
  reportDate,
  defaultSignerName,
}: SignContainerProps) {
  const router = useRouter()
  const supabase = createClient()
  const canvasRef = useRef<{ clear: () => void } | null>(null)

  const [signerName, setSignerName] = useState(defaultSignerName)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleClear = () => {
    canvasRef.current?.clear()
    setSignatureData(null)
  }

  const handleSkip = () => {
    // サインなしで日報入力画面に戻る
    router.push(`/nippo?date=${reportDate}`)
  }

  const handleConfirm = async () => {
    if (!signatureData) {
      alert('サインを入力してください')
      return
    }
    if (!signerName.trim()) {
      alert('サイン者名を入力してください')
      return
    }

    setSubmitting(true)

    try {
      let imagePath: string | null = null

      // Base64をBlobに変換してStorageにアップロードを試行
      try {
        const base64Data = signatureData.split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/png' })

        const filePath = `${reportId}_${Date.now()}.png`
        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(filePath, blob, {
            upsert: true,
            contentType: 'image/png',
          })

        if (uploadError) {
          console.warn('Storage upload failed:', uploadError.message)
        } else {
          imagePath = filePath
        }
      } catch (storageError) {
        console.warn('Storage upload skipped:', storageError)
      }

      // ストレージにアップロードできなかった場合は警告
      if (!imagePath) {
        console.warn('署名画像を保存できませんでした。Supabase Storageの設定を確認してください。')
      }

      // signaturesテーブルに登録
      const { error: insertError } = await supabase
        .from('signatures')
        .insert({
          daily_report_id: reportId,
          signer_name: signerName.trim(),
          image_path: imagePath,
          signed_at: new Date().toISOString(),
          is_locked: true,
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        alert('サインの保存に失敗しました: ' + insertError.message)
        setSubmitting(false)
        return
      }

      // 日報のステータスを更新
      await supabase
        .from('daily_reports')
        .update({ check_status: '提出済' })
        .eq('id', reportId)

      // 日報入力画面に戻る
      router.push(`/nippo?date=${reportDate}`)
    } catch (error) {
      console.error('Error:', error)
      alert('エラーが発生しました')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ヘッダー情報 */}
      <div className="flex-shrink-0 border-b bg-white px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{siteName}</p>
            <p className="text-xs text-gray-500">{clientCompanyName}</p>
          </div>
          <div className="text-right">
            <Badge className="text-xs">{contractType}</Badge>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(new Date(reportDate), 'yyyy/M/d', { locale: ja })}
            </p>
          </div>
        </div>
      </div>

      {/* サイン者名入力 */}
      <div className="flex-shrink-0 border-b px-4 py-2">
        <Label htmlFor="signerName" className="text-sm">サイン者名</Label>
        <Input
          id="signerName"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="発注元会社の所属長名"
          className="mt-1 h-9"
        />
      </div>

      {/* 横向き推奨ガイド */}
      <div className="flex-shrink-0 bg-blue-50 px-4 py-1.5 text-center text-xs text-blue-600">
        横向きでのサインを推奨します
      </div>

      {/* サインキャンバス - 残りのスペースを使用 */}
      <div className="flex-1 min-h-0 p-3">
        <SignCanvas
          ref={canvasRef}
          onSignatureChange={setSignatureData}
        />
      </div>

      {/* ボタンエリア - Canvas直下 */}
      <div className="flex-shrink-0 bg-white px-4 pb-4 pt-2 space-y-3 safe-area-inset-bottom">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11"
            onClick={handleClear}
            disabled={submitting}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            やり直し
          </Button>
          <Button
            className="flex-1 h-11"
            onClick={handleConfirm}
            disabled={!signatureData || !signerName.trim() || submitting}
          >
            <Check className="mr-2 h-4 w-4" />
            {submitting ? '保存中...' : 'サインを確定'}
          </Button>
        </div>

        {/* サインなしで進むリンク */}
        <button
          type="button"
          onClick={handleSkip}
          disabled={submitting}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          サインなしで進む
        </button>
      </div>
    </div>
  )
}
