import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const email = "cultleaderzoz.dev@gmail.com"
  const password = "HELIXA-2027!"

  // List users to check if admin exists
  const { data: usersData } = await supabase.auth.admin.listUsers()
  const exists = usersData?.users.find(u => u.email === email)

  if (!exists) {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (newUser?.user) {
      // Small delay to ensure the database trigger creates the account row first
      await new Promise(resolve => setTimeout(resolve, 500))
      
      await supabase.from('accounts').update({ role: 'admin' }).eq('user_id', newUser.user.id)
      return NextResponse.json({ success: true, created: true })
    } else {
      return NextResponse.json({ success: false, error: createError?.message })
    }
  }

  // Ensure role is admin and account exists
  if (exists) {
    const { data: existingAccount } = await supabase.from('accounts').select('id').eq('user_id', exists.id).single()
    if (!existingAccount) {
        await supabase.from('accounts').insert({
            user_id: exists.id,
            email: exists.email,
            role: 'admin',
            plan: 'one_time'
        })
    } else {
        await supabase.from('accounts').update({ role: 'admin' }).eq('user_id', exists.id)
    }
  }

  return NextResponse.json({ success: true, created: false })
}
