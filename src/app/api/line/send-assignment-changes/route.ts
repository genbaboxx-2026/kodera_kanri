import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  createAssignmentAddedNotification,
  createAssignmentRemovedNotification,
  createAssignmentMovedNotification,
} from '@/lib/line/flex-templates'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN

interface WorkerChange {
  workerId: number
  workerName: string
  siteName: string
  changeType: 'added' | 'removed' | 'moved'
  fromSiteName?: string  // 移動の場合
  toSiteName?: string    // 移動の場合
}

interface SendResult {
  workerId: number
  workerName: string
  changeType: 'added' | 'removed' | 'moved'
  lineUserId: string | null
  success: boolean
  error?: string
}

// LINE Messaging APIでメッセージを送信
async function sendLineMessage(lineUserId: string, message: object): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not set')
    return false
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [message],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE API error:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('LINE API request failed:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targetDate, changes } = body as { targetDate: string; changes: WorkerChange[] }

    if (!targetDate) {
      return NextResponse.json(
        { error: '対象日付が必要です' },
        { status: 400 }
      )
    }

    if (!changes || changes.length === 0) {
      return NextResponse.json(
        { error: '変更内容がありません' },
        { status: 400 }
      )
    }

    // 作業員のLINE IDを取得
    const workerIds = changes.map(c => c.workerId)
    const { data: workers, error: workersError } = await supabaseAdmin
      .from('workers')
      .select('id, name, line_user_id')
      .in('id', workerIds)

    if (workersError) {
      console.error('Workers fetch error:', workersError)
      return NextResponse.json(
        { error: '作業員データの取得に失敗しました' },
        { status: 500 }
      )
    }

    // 日付フォーマット
    const formattedDate = format(new Date(targetDate), 'M月d日(E)', { locale: ja })

    // 変更があった作業員の確認状態をリセット（最新の配置で再確認が必要）
    // 対象日の全てのassignment_workersを取得してリセット
    const { data: assignmentsOnDate } = await supabaseAdmin
      .from('assignments')
      .select('id')
      .eq('target_date', targetDate)

    if (assignmentsOnDate && assignmentsOnDate.length > 0) {
      const assignmentIds = assignmentsOnDate.map(a => a.id)

      // 変更があった作業員のconfirmedをfalseにリセット
      for (const change of changes) {
        await supabaseAdmin
          .from('assignment_workers')
          .update({
            confirmed: false,
            confirmed_at: null,
          })
          .in('assignment_id', assignmentIds)
          .eq('worker_id', change.workerId)
      }
    }

    const results: SendResult[] = []
    let sentCount = 0
    let noLineIdCount = 0
    let errorCount = 0

    // 各変更に対してメッセージを送信
    for (const change of changes) {
      const worker = workers?.find(w => w.id === change.workerId)

      const result: SendResult = {
        workerId: change.workerId,
        workerName: change.workerName,
        changeType: change.changeType,
        lineUserId: worker?.line_user_id || null,
        success: false,
      }

      if (!worker?.line_user_id) {
        result.error = 'LINE未連携'
        noLineIdCount++
        results.push(result)
        continue
      }

      // 通知レコードを作成（movedの場合はsite_nameに移動先を保存）
      const siteNameForRecord = change.changeType === 'moved'
        ? `${change.fromSiteName} → ${change.toSiteName}`
        : change.siteName

      const { data: notification, error: notificationError } = await supabaseAdmin
        .from('assignment_change_notifications')
        .insert({
          worker_id: change.workerId,
          target_date: targetDate,
          site_name: siteNameForRecord,
          change_type: change.changeType === 'moved' ? 'added' : change.changeType, // DBは'added'/'removed'のみ
        })
        .select()
        .single()

      if (notificationError || !notification) {
        console.error('Failed to create notification record:', notificationError)
        result.error = '通知レコード作成失敗'
        errorCount++
        results.push(result)
        continue
      }

      // 変更タイプに応じたメッセージを作成
      let message
      if (change.changeType === 'moved') {
        message = createAssignmentMovedNotification(
          formattedDate,
          change.fromSiteName!,
          change.toSiteName!,
          notification.id
        )
      } else if (change.changeType === 'added') {
        message = createAssignmentAddedNotification(formattedDate, change.siteName, notification.id)
      } else {
        message = createAssignmentRemovedNotification(formattedDate, change.siteName, notification.id)
      }

      // 送信
      const success = await sendLineMessage(worker.line_user_id, message)

      if (success) {
        result.success = true
        sentCount++
      } else {
        result.error = 'LINE送信失敗'
        errorCount++
      }

      results.push(result)
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        sent: sentCount,
        noLineId: noLineIdCount,
        errors: errorCount,
      },
      results,
    })
  } catch (error) {
    console.error('Error sending LINE messages:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
