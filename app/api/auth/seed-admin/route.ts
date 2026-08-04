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
      // Upsert the account row to guarantee it exists and is an admin
      await supabase.from('accounts').upsert({ 
        id: newUser.user.id,
        email: newUser.user.email,
        role: 'admin',
        plan: 'lifetime'
      }, { onConflict: 'id' })
      return NextResponse.json({ success: true, created: true })
    } else {
      return NextResponse.json({ success: false, error: createError?.message })
    }
  }

  // If user already existed in auth, guarantee they have an admin account row
  // and force the password to be correct so they can log in.
  if (exists) {
    await supabase.auth.admin.updateUserById(exists.id, { password })

    await supabase.from('accounts').upsert({
      id: exists.id,
      email: exists.email,
      role: 'admin',
      plan: 'lifetime'
    }, { onConflict: 'id' })
  }

  return NextResponse.json({ success: true, created: false })
}
