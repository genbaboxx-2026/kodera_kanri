import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      name_kana,
      email,
      password,
      system_role,
      can_edit_haichi,
      can_edit_nippo,
      employment_type,
      department,
      fixed_overtime_hours,
    } = body

    if (!name || !name_kana || !employment_type || !department) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // メールアドレスが入力されている場合はパスワードも必須
    if (email && !password) {
      return NextResponse.json(
        { error: 'メールアドレスを設定する場合は初期パスワードも必要です' },
        { status: 400 }
      )
    }

    // 作業員を登録
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .insert({
        name,
        name_kana,
        email: email || null,
        system_role: system_role || null,
        can_edit_haichi: can_edit_haichi ?? false,
        can_edit_nippo: can_edit_nippo ?? false,
        employment_type,
        department,
        fixed_overtime_hours: fixed_overtime_hours || 0,
      })
      .select()
      .single()

    if (workerError) {
      console.error('Worker error:', workerError)
      if (workerError.code === '23505') {
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: '作業員の登録に失敗しました' },
        { status: 500 }
      )
    }

    // メールアドレスが入力されている場合、Supabase Authにユーザーを作成
    if (email && password && system_role) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        console.error('Auth error:', authError)
        // 作業員は登録済みなので、authエラーの場合はworkerのemailをnullに戻す
        await supabaseAdmin
          .from('workers')
          .update({ email: null, system_role: null })
          .eq('id', worker.id)
        return NextResponse.json(
          { error: `認証アカウントの作成に失敗: ${authError.message}` },
          { status: 400 }
        )
      }

      if (authData.user) {
        // profilesテーブルを更新（トリガーで自動作成されるが、worker_idを紐付け）
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            worker_id: worker.id,
            role: system_role,
            display_name: name,
          })
          .eq('id', authData.user.id)

        if (profileError) {
          console.error('Profile update error:', profileError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      worker,
    })
  } catch (error) {
    console.error('Error creating worker:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      name,
      name_kana,
      email,
      password,
      system_role,
      can_edit_haichi,
      can_edit_nippo,
      employment_type,
      department,
      fixed_overtime_hours,
      status,
    } = body

    if (!id) {
      return NextResponse.json(
        { error: '作業員IDが必要です' },
        { status: 400 }
      )
    }

    // 現在の作業員情報を取得
    const { data: currentWorker } = await supabaseAdmin
      .from('workers')
      .select('email')
      .eq('id', id)
      .single()

    // 作業員を更新
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .update({
        name,
        name_kana,
        email: email || null,
        system_role: system_role || null,
        can_edit_haichi: can_edit_haichi ?? false,
        can_edit_nippo: can_edit_nippo ?? false,
        employment_type,
        department,
        fixed_overtime_hours,
        status,
      })
      .eq('id', id)
      .select()
      .single()

    if (workerError) {
      console.error('Worker update error:', workerError)
      if (workerError.code === '23505') {
        return NextResponse.json(
          { error: 'このメールアドレスは既に使用されています' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: '作業員の更新に失敗しました' },
        { status: 500 }
      )
    }

    // 新しくメールアドレスが設定された場合、Authアカウントを作成
    if (email && password && system_role && !currentWorker?.email) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        console.error('Auth error:', authError)
        return NextResponse.json(
          { error: `認証アカウントの作成に失敗: ${authError.message}` },
          { status: 400 }
        )
      }

      if (authData.user) {
        await supabaseAdmin
          .from('profiles')
          .update({
            worker_id: id,
            role: system_role,
            display_name: name,
          })
          .eq('id', authData.user.id)
      }
    } else if (email && currentWorker?.email === email) {
      // 既存のアカウントがある場合、profilesのroleとdisplay_nameを更新
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('worker_id', id)

      if (profiles && profiles.length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update({
            role: system_role || '現場スタッフ',
            display_name: name,
          })
          .eq('worker_id', id)
      }
    }

    return NextResponse.json({
      success: true,
      worker,
    })
  } catch (error) {
    console.error('Error updating worker:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workerId = searchParams.get('id')

    if (!workerId) {
      return NextResponse.json(
        { error: '作業員IDが必要です' },
        { status: 400 }
      )
    }

    // 紐付いているprofileを取得
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('worker_id', parseInt(workerId))

    // 作業員を削除（または退職に変更）
    const { error: workerError } = await supabaseAdmin
      .from('workers')
      .update({ status: '退職' })
      .eq('id', parseInt(workerId))

    if (workerError) {
      return NextResponse.json(
        { error: '作業員の削除に失敗しました' },
        { status: 500 }
      )
    }

    // 紐付いているAuthユーザーも削除する場合（オプション）
    // if (profiles && profiles.length > 0) {
    //   for (const profile of profiles) {
    //     await supabaseAdmin.auth.admin.deleteUser(profile.id)
    //   }
    // }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting worker:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
