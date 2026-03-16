import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createMultiSiteAssignmentNotification } from '@/lib/line/flex-templates'
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

interface SendResult {
  workerId: number
  workerName: string
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
    const { targetDate, assignmentIds } = body

    if (!targetDate) {
      return NextResponse.json(
        { error: '対象日付が必要です' },
        { status: 400 }
      )
    }

    // 配置データを取得
    let query = supabaseAdmin
      .from('assignments')
      .select(`
        id,
        target_date,
        contract_type,
        shift_type,
        memo,
        site:sites(id, name, client_company:companies!sites_client_company_id_fkey(name)),
        workers:assignment_workers(
          id,
          worker:workers(id, name, line_user_id)
        )
      `)
      .eq('target_date', targetDate)

    // 特定の配置IDが指定されている場合はフィルタ
    if (assignmentIds && assignmentIds.length > 0) {
      query = query.in('id', assignmentIds)
    }

    const { data: assignments, error: assignmentError } = await query

    if (assignmentError) {
      console.error('Assignment fetch error:', assignmentError)
      return NextResponse.json(
        { error: '配置データの取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!assignments || assignments.length === 0) {
      return NextResponse.json(
        { error: '対象の配置がありません' },
        { status: 404 }
      )
    }

    // 日付フォーマット
    const formattedDate = format(new Date(targetDate), 'M月d日(E)', { locale: ja })

    // 作業員ごとにグループ化（同じ人が複数現場に配置されている場合をまとめる）
    const workerAssignments = new Map<number, {
      workerId: number
      workerName: string
      lineUserId: string | null
      siteNames: string[]
      assignmentWorkerIds: number[]
    }>()

    for (const assignment of assignments) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const site = assignment.site as any
      const siteName = site?.name || '不明な現場'

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workers = (assignment.workers || []) as any[]

      for (const assignmentWorker of workers) {
        const worker = assignmentWorker?.worker
        if (!worker) continue

        const existing = workerAssignments.get(worker.id)
        if (existing) {
          existing.siteNames.push(siteName)
          existing.assignmentWorkerIds.push(assignmentWorker.id)
        } else {
          workerAssignments.set(worker.id, {
            workerId: worker.id,
            workerName: worker.name,
            lineUserId: worker.line_user_id || null,
            siteNames: [siteName],
            assignmentWorkerIds: [assignmentWorker.id],
          })
        }
      }
    }

    const results: SendResult[] = []
    let sentCount = 0
    let noLineIdCount = 0
    let errorCount = 0

    // 各作業員にまとめてメッセージを送信
    for (const workerData of workerAssignments.values()) {
      const result: SendResult = {
        workerId: workerData.workerId,
        workerName: workerData.workerName,
        lineUserId: workerData.lineUserId,
        success: false,
      }

      if (!workerData.lineUserId) {
        result.error = 'LINE未連携'
        noLineIdCount++
        results.push(result)
        continue
      }

      // Flexメッセージを作成（複数現場をまとめて）
      const message = createMultiSiteAssignmentNotification(
        formattedDate,
        workerData.siteNames,
        workerData.assignmentWorkerIds
      )

      // 送信
      const success = await sendLineMessage(workerData.lineUserId, message)

      if (success) {
        result.success = true
        sentCount++
      } else {
        result.error = 'LINE送信失敗'
        errorCount++
      }

      results.push(result)
    }

    // 配置のpublished_atを更新
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('assignments')
      .update({ published_at: now })
      .eq('target_date', targetDate)

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
