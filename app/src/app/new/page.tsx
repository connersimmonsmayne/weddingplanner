'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export default function NewWeddingPage() {
  const [name, setName] = useState('')
  const [partner1Name, setPartner1Name] = useState('')
  const [partner2Name, setPartner2Name] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [budget, setBudget] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('You must be logged in')
      setLoading(false)
      return
    }

    // Generate a unique invite code
    const inviteCode = generateInviteCode()

    // Create the wedding
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .insert({
        name: name || `${partner1Name} & ${partner2Name}`,
        partner1_name: partner1Name,
        partner2_name: partner2Name,
        wedding_date: weddingDate || null,
        budget: budget ? parseFloat(budget) : null,
        location: location || null,
        invite_code: inviteCode,
      })
      .select()
      .single()

    if (weddingError) {
      toast.error(`Failed to create wedding: ${weddingError.message}`)
      console.error('Wedding creation error:', weddingError.message, weddingError.code, weddingError.details)
      setLoading(false)
      return
    }

    // Add the creator as admin
    const { error: memberError } = await supabase
      .from('wedding_members')
      .insert({
        wedding_id: wedding.id,
        user_id: user.id,
        role: 'admin',
        display_name: partner1Name,
      })

    if (memberError) {
      toast.error('Failed to set up wedding membership')
      console.error(memberError)
      setLoading(false)
      return
    }

    toast.success('Wedding created! Share your invite code with your partner.')
    router.push(`/dashboard?wedding=${wedding.id}`)
    router.refresh()
  }

  // Auto-generate name when partner names change
  const autoName = partner1Name && partner2Name 
    ? `${partner1Name} & ${partner2Name}` 
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Wedding</CardTitle>
          <CardDescription>Start planning your special day</CardDescription>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner1">Your Name *</Label>
                <Input
                  id="partner1"
                  type="text"
                  placeholder="Partner 1"
                  value={partner1Name}
                  onChange={(e) => setPartner1Name(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner2">Partner&apos;s Name *</Label>
                <Input
                  id="partner2"
                  type="text"
                  placeholder="Partner 2"
                  value={partner2Name}
                  onChange={(e) => setPartner2Name(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Wedding Name</Label>
              <Input
                id="name"
                type="text"
                placeholder={autoName || "e.g., The Smith Wedding"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use &quot;{autoName || 'Partner 1 & Partner 2'}&quot;
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Wedding Date (optional)</Label>
              <Input
                id="date"
                type="date"
                value={weddingDate}
                onChange={(e) => setWeddingDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="40000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                type="text"
                placeholder="e.g., St. Louis, MO"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Wedding'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              <Link href="/select" className="text-primary hover:underline">
                Back to wedding selector
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
