import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LandingPage } from '@/components/landing/landing-page'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in, redirect to wedding selection
  if (user) {
    redirect('/select')
  }

  // Show landing page for non-authenticated users
  return <LandingPage />
}
