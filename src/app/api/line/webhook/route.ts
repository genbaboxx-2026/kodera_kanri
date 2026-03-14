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
      text: '小寺工務店 業務管理システムへようこそ！\n\n配置連絡を受け取るには、アカウント連携が必要です。\n\nあなたの「作業員番号」を入力してください。\n（作業員番号は管理者にご確認ください）',
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
  // メッセージ受信時の処理（作業員番号入力によるLINE連携）
  if (event.message.type !== 'text' || !event.message.text) {
    return
  }

  const lineUserId = event.source.userId
  const text = event.message.text.trim()
  console.log(`Message from ${lineUserId}: ${text}`)

  // 数字のみの入力を作業員番号として扱う
  if (!/^\d+$/.test(text)) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: '作業員番号を数字で入力してください。\n\n例: 1',
      },
    ])
    return
  }

  const workerId = parseInt(text)

  // 作業員を検索
  const { data: worker, error: workerError } = await supabaseAdmin
    .from('workers')
    .select('id, name, line_user_id')
    .eq('id', workerId)
    .single()

  if (workerError || !worker) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `作業員番号 ${workerId} が見つかりませんでした。\n\n正しい番号を入力してください。`,
      },
    ])
    return
  }

  // 既に他のLINEアカウントと連携済みの場合
  if (worker.line_user_id && worker.line_user_id !== lineUserId) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: 'この作業員番号は既に別のLINEアカウントと連携されています。\n\n管理者にお問い合わせください。',
      },
    ])
    return
  }

  // 既にこのLINEアカウントと連携済みの場合
  if (worker.line_user_id === lineUserId) {
    await replyMessage(event.replyToken, [
      {
        type: 'text',
        text: `${worker.name}さん、既にアカウント連携済みです。\n\n配置連絡をお待ちください。`,
      },
    ])
    return
  }

  // LINE連携を実行
  const { error: updateError } = await supabaseAdmin
    .from('workers')
    .update({ line_user_id: lineUserId })
    .eq('id', workerId)

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
