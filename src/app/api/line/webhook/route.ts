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
      text: '小寺工務店 業務管理システムへようこそ！\n\n配置連絡を受け取るには、アカウント連携が必要です。\n\nシステムに登録されている「メールアドレス」を入力してください。',
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
}

async function handleMessage(event: {
  source: { userId: string }
  replyToken: string
  message: { type: string; text?: string }
}) {
  // メッセージ受信時の処理（メールアドレス入力によるLINE連携）
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
          text: '現在、連携されているアカウントはありません。\n\nメールアドレスを入力して連携してください。',
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
        text: `${currentWorker.name}さんの連携を解除しました。\n\n再度連携する場合は、メールアドレスを入力してください。`,
      },
    ])
    return
  }

  // メールアドレスの簡易バリデーション
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(text)) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: 'メールアドレスを入力してください。\n\n連携を解除する場合は「リセット」と送信してください。',
      },
    ])
    return
  }

  const email = text.toLowerCase()

  // メールアドレスで作業員を検索
  const { data: worker, error: workerError } = await supabaseAdmin
    .from('workers')
    .select('id, name, line_user_id')
    .eq('email', email)
    .single()

  if (workerError || !worker) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '登録されていないメールアドレスです。\n\n管理者に確認してください。',
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
