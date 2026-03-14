import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// リマインド通知用Cronエンドポイント
// Vercel Cronまたは外部Cronサービスから定期実行される
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（CronシークレットキーまたはVercel Cron）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now = new Date()
    const currentHour = now.getHours()

    // 17:00: 日報リマインド
    if (currentHour === 17) {
      await sendNippoReminders(supabase)
    }

    // 18:00: 配置入力リマインド
    if (currentHour === 18) {
      await sendHaichiReminders(supabase)
    }

    return NextResponse.json({ success: true, timestamp: now.toISOString() })
  } catch (error) {
    console.error('Remind cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendNippoReminders(supabase: SupabaseClient<any, any, any>) {
  // 本日の日報が未提出の職長を取得
  const today = new Date().toISOString().split('T')[0]

  // TODO: 日報未提出の職長を取得
  // const { data: unreportedAssignments } = await supabase
  //   .from('assignments')
  //   .select(`
  //     id,
  //     site:sites(name),
  //     assignment_workers(
  //       worker:workers(
  //         id,
  //         name,
  //         role
  //       )
  //     )
  //   `)
  //   .eq('target_date', today)
  //   .is('daily_reports', null)

  console.log('Sending nippo reminders for:', today)

  // TODO: LINE APIでリマインドメッセージを送信
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendHaichiReminders(supabase: SupabaseClient<any, any, any>) {
  // 翌日の配置が未完了の場合、白籏さんにリマインド
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // TODO: 翌日の配置状況を確認
  // 全作業員が配置されているか確認

  console.log('Checking haichi completion for:', tomorrowStr)

  // TODO: 未完了の場合、白籏さんにLINEリマインドを送信
}
