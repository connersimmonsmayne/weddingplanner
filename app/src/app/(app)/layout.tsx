import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WeddingProvider } from '@/components/providers/wedding-provider'
import { Navigation } from '@/components/layout/navigation'

async function getWeddingData(weddingId: string, userId: string) {
  const supabase = await createClient()
  
  // Get membership
  const { data: membership } = await supabase
    .from('wedding_members')
    .select('*')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .single()

  if (!membership) return null

  // Get wedding
  const { data: wedding } = await supabase
    .from('weddings')
    .select('*')
    .eq('id', weddingId)
    .single()

  return { wedding, membership }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <WeddingProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 py-6">
            {children}
          </main>
        </div>
      </WeddingProvider>
    </Suspense>
  )
}
