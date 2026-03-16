import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

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

// LINE Messaging APIでリプライメッセージを送信
async function replyMessage(replyToken: string, messages: object[]): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN is not set')
    return false
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LINE Reply API error:', response.status, errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('LINE Reply API request failed:', error)
    return false
  }
}

// LINE Webhook受信エンドポイント
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    // 署名検証
    if (!verifySignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    const events = JSON.parse(body).events

    for (const event of events) {
      switch (event.type) {
        case 'follow':
          // 友だち追加時の処理
          await handleFollow(event)
          break
        case 'postback':
          // 確認ボタン押下時の処理
          await handlePostback(event)
          break
        case 'message':
          // メッセージ受信時の処理
          await handleMessage(event)
          break
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('LINE Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false

  const channelSecret = process.env.LINE_CHANNEL_SECRET
  if (!channelSecret) return false

  const hash = crypto
    .createHmac('sha256', channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

async function handleFollow(event: {
  source: { userId: string }
  replyToken: string
}) {
  // 友だち追加時の処理
  const lineUserId = event.source.userId
  console.log('New follower:', lineUserId)

  // 紐付け案内メッセージを送信
  await replyMessage(event.replyToken, [
    {
      type: 'text',
      text: '小寺工務店 業務管理システムへようこそ！\n\n配置連絡を受け取るには、アカウント連携が必要です。\n\nシステムに登録されている「電話番号」を入力してください（ハイフンなし）。\n\n例: 09012345678',
    },
  ])
}

async function handlePostback(event: {
  source: { userId: string }
  replyToken: string
  postback: { data: string }
}) {
  // 確認ボタン押下時の処理
  const lineUserId = event.source.userId
  const data = new URLSearchParams(event.postback.data)
  const action = data.get('action')
  const assignmentWorkerId = data.get('assignment_worker_id')
  const notificationId = data.get('notification_id')

  // 通常の配置確認（単一）
  if (action === 'confirm' && assignmentWorkerId) {
    console.log(`User ${lineUserId} confirmed assignment_worker ${assignmentWorkerId}`)

    // assignment_workersテーブルのconfirmedをtrueに更新
    const { error } = await supabaseAdmin
      .from('assignment_workers')
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', parseInt(assignmentWorkerId))

    if (error) {
      console.error('Failed to update confirmation:', error)
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '確認の記録に失敗しました。もう一度お試しください。',
        },
      ])
      return
    }

    // 確認完了メッセージを送信
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '✅ 確認しました！\n\nお気をつけて現場へお向かいください。',
      },
    ])
  }

  // 複数現場の配置確認
  const assignmentWorkerIds = data.get('assignment_worker_ids')
  if (action === 'confirm_multi' && assignmentWorkerIds) {
    const ids = assignmentWorkerIds.split(',').map(id => parseInt(id))
    console.log(`User ${lineUserId} confirmed multiple assignment_workers: ${ids.join(', ')}`)

    // 全てのassignment_workersを確認済みに更新
    const { error } = await supabaseAdmin
      .from('assignment_workers')
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .in('id', ids)

    if (error) {
      console.error('Failed to update confirmation:', error)
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '確認の記録に失敗しました。もう一度お試しください。',
        },
      ])
      return
    }

    // 確認完了メッセージを送信
    const siteCount = ids.length
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `✅ ${siteCount}件の配置を確認しました！\n\nお気をつけて現場へお向かいください。`,
      },
    ])
  }

  // 変更通知の確認
  if (action === 'confirm_change' && notificationId) {
    console.log(`User ${lineUserId} confirmed change notification ${notificationId}`)

    // まず既に確認済みかどうかチェック
    const { data: notification, error: fetchError } = await supabaseAdmin
      .from('assignment_change_notifications')
      .select('id, confirmed, site_name, change_type')
      .eq('id', parseInt(notificationId))
      .single()

    if (fetchError || !notification) {
      console.error('Failed to fetch notification:', fetchError)
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '通知が見つかりませんでした。',
        },
      ])
      return
    }

    // 既に確認済みの場合
    if (notification.confirmed) {
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: 'この変更通知は既に確認済みです。',
        },
      ])
      return
    }

    // 確認状態を更新
    const { error: updateError } = await supabaseAdmin
      .from('assignment_change_notifications')
      .update({
        confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', parseInt(notificationId))

    if (updateError) {
      console.error('Failed to update change notification confirmation:', updateError)
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '確認の記録に失敗しました。もう一度お試しください。',
        },
      ])
      return
    }

    // 確認完了メッセージを送信
    const changeTypeText = notification.change_type === 'added' ? '追加' : '解除'
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `✅ 変更を確認しました！\n\n${notification.site_name}への配置${changeTypeText}を確認しました。`,
      },
    ])
  }
}

async function handleMessage(event: {
  source: { userId: string }
  replyToken: string
  message: { type: string; text?: string }
}) {
  // メッセージ受信時の処理（電話番号入力によるLINE連携）
  if (event.message.type !== 'text' || !event.message.text) {
    return
  }

  const lineUserId = event.source.userId
  const text = event.message.text.trim()
  console.log(`Message from ${lineUserId}: ${text}`)

  // 「リセット」コマンドの処理
  if (text === 'リセット' || text === 'reset' || text === 'RESET') {
    // 現在のline_user_idで紐付いている作業員を検索
    const { data: currentWorker } = await supabaseAdmin
      .from('workers')
      .select('id, name')
      .eq('line_user_id', lineUserId)
      .single()

    if (!currentWorker) {
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: '現在、連携されているアカウントはありません。\n\n電話番号を入力して連携してください。',
        },
      ])
      return
    }

    // 連携を解除
    await supabaseAdmin
      .from('workers')
      .update({ line_user_id: null })
      .eq('id', currentWorker.id)

    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `${currentWorker.name}さんの連携を解除しました。\n\n再度連携する場合は、電話番号を入力してください。`,
      },
    ])
    return
  }

  // 電話番号を正規化（ハイフン・スペース・その他記号を除去）
  const normalizedPhone = text.replace(/[\s\-ー−\(\)（）]/g, '')

  // 電話番号のバリデーション（数字のみ、10〜11桁）
  if (!/^\d{10,11}$/.test(normalizedPhone)) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '電話番号を入力してください（ハイフンなし）。\n\n例: 09012345678\n\n連携を解除する場合は「リセット」と送信してください。',
      },
    ])
    return
  }

  // 電話番号で作業員を検索
  const { data: worker, error: workerError } = await supabaseAdmin
    .from('workers')
    .select('id, name, line_user_id')
    .eq('phone', normalizedPhone)
    .single()

  if (workerError || !worker) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '登録されていない電話番号です。\n\n管理者に確認してください。',
      },
    ])
    return
  }

  // 既にこのLINEアカウントと連携済みの場合
  if (worker.line_user_id === lineUserId) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `${worker.name}さん、すでに連携済みです。\n\n再連携する場合は「リセット」と送信してください。`,
      },
    ])
    return
  }

  // 既に別のLINEアカウントと連携済みの場合 → 古い紐付けを解除して新しく紐付け
  if (worker.line_user_id && worker.line_user_id !== lineUserId) {
    console.log(`Replacing LINE link for worker ${worker.id}: ${worker.line_user_id} -> ${lineUserId}`)
  }

  // このLINEユーザーIDが別の作業員に紐付いている場合 → 古い紐付けを解除
  const { data: existingWorker } = await supabaseAdmin
    .from('workers')
    .select('id, name')
    .eq('line_user_id', lineUserId)
    .single()

  if (existingWorker && existingWorker.id !== worker.id) {
    await supabaseAdmin
      .from('workers')
      .update({ line_user_id: null })
      .eq('id', existingWorker.id)
    console.log(`Cleared LINE link from worker ${existingWorker.id} (${existingWorker.name})`)
  }

  // LINE連携を実行
  const { error: updateError } = await supabaseAdmin
    .from('workers')
    .update({ line_user_id: lineUserId })
    .eq('id', worker.id)

  if (updateError) {
    console.error('Failed to link LINE account:', updateError)
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: 'アカウント連携に失敗しました。\n\nもう一度お試しいただくか、管理者にお問い合わせください。',
      },
    ])
    return
  }

  // 連携完了メッセージ
  await replyMessage(event.replyToken, [
    {
      type: 'text',
      text: `✅ ${worker.name}さん、アカウント連携が完了しました！\n\nこれより配置連絡をこのLINEでお届けします。`,
    },
  ])
}
