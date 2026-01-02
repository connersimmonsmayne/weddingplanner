import { redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Membership {
  role: 'admin' | 'member'
  wedding_id: string
}

interface Wedding {
  id: string
  name: string
  partner1_name: string
  partner2_name: string
  wedding_date: string | null
  location: string | null
}

export default async function SelectWeddingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all wedding memberships for the user
  const { data: memberships, error: membershipsError } = await supabase
    .from('wedding_members')
    .select('role, wedding_id')
    .eq('user_id', user.id) as { data: Membership[] | null, error: unknown }

  if (membershipsError) {
    console.error('Error fetching memberships:', membershipsError)
  }

  // If no memberships, show create or join options
  if (!memberships || memberships.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome!</CardTitle>
            <CardDescription>Get started with your wedding planning</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link href="/new">
              <Button className="w-full" size="lg">
                Create New Wedding
              </Button>
            </Link>
            <Link href="/join">
              <Button variant="outline" className="w-full" size="lg">
                Join with Invite Code
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user has exactly one wedding, redirect to dashboard
  if (memberships.length === 1) {
    redirect(`/dashboard?wedding=${memberships[0].wedding_id}`)
  }

  // Fetch wedding details for multiple weddings
  const weddingIds = memberships.map(m => m.wedding_id)
  const { data: weddingsData } = await supabase
    .from('weddings')
    .select('id, name, partner1_name, partner2_name, wedding_date, location')
    .in('id', weddingIds) as { data: Wedding[] | null }

  const weddings = weddingsData?.map(w => ({
    id: w.id,
    name: w.name,
    partner1_name: w.partner1_name,
    partner2_name: w.partner2_name,
    wedding_date: w.wedding_date,
    location: w.location,
    role: memberships.find(m => m.wedding_id === w.id)?.role
  })) || []

  // Show wedding selector
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Weddings</h1>
          <p className="text-muted-foreground">Select a wedding to continue planning</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {weddings.map((wedding) => (
            <Link key={wedding.id} href={`/dashboard?wedding=${wedding.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{wedding.name}</CardTitle>
                    {wedding.role === 'admin' && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {wedding.partner1_name} & {wedding.partner2_name}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {wedding.wedding_date && (
                      <p>Date: {new Date(wedding.wedding_date).toLocaleDateString()}</p>
                    )}
                    {wedding.location && <p>Location: {wedding.location}</p>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          <Link href="/new">
            <Card className="hover:border-primary transition-colors cursor-pointer h-full border-dashed flex items-center justify-center min-h-[150px]">
              <CardContent className="text-center">
                <p className="text-4xl mb-2">+</p>
                <p className="text-muted-foreground">Create New Wedding</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
