import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // ログイン済みの場合は現場一覧へリダイレクト
    redirect("/sites")
  } else {
    // 未ログインの場合はログイン画面へリダイレクト
    redirect("/login")
  }
}
