'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

function JoinPageContent() {
  const searchParams = useSearchParams()
  const codeFromUrl = searchParams.get('code')

  const [inviteCode, setInviteCode] = useState(codeFromUrl?.toUpperCase() || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)
  const [autoJoining, setAutoJoining] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Handle auto-join when user returns from email confirmation
  useEffect(() => {
    const checkSessionAndAutoJoin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      // If user is authenticated and has a code in URL, attempt auto-join
      if (session?.user && codeFromUrl) {
        setAutoJoining(true)
        await joinWedding(session.user.id, codeFromUrl.toUpperCase())
      }
    }

    checkSessionAndAutoJoin()
  }, [codeFromUrl])

  // Update invite code if URL param changes
  useEffect(() => {
    if (codeFromUrl) {
      setInviteCode(codeFromUrl.toUpperCase())
    }
  }, [codeFromUrl])

  const joinWedding = async (userId: string, code: string) => {
    // Find wedding by invite code
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, name')
      .eq('invite_code', code)
      .single()

    if (weddingError || !wedding) {
      toast.error('Invalid invite code')
      setAutoJoining(false)
      setLoading(false)
      return false
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from('wedding_members')
      .select('id')
      .eq('wedding_id', wedding.id)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      toast.info('You are already a member of this wedding!')
      await redirectBasedOnWeddingCount(userId, wedding.id)
      return true
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('wedding_members')
      .insert({
        wedding_id: wedding.id,
        user_id: userId,
        role: 'member',
        display_name: displayName || null,
      })

    if (memberError) {
      toast.error('Failed to join wedding')
      setAutoJoining(false)
      setLoading(false)
      return false
    }

    toast.success(`Welcome to ${wedding.name}!`)
    await redirectBasedOnWeddingCount(userId, wedding.id)
    return true
  }

  const redirectBasedOnWeddingCount = async (userId: string, joinedWeddingId: string) => {
    // Count how many weddings the user is part of
    const { data: memberships } = await supabase
      .from('wedding_members')
      .select('wedding_id')
      .eq('user_id', userId)

    if (memberships && memberships.length === 1) {
      // Only one wedding - go directly to dashboard
      router.push(`/dashboard?wedding=${joinedWeddingId}`)
    } else {
      // Multiple weddings - go to selector
      router.push('/select')
    }
    router.refresh()
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let userId: string | undefined

    if (hasAccount) {
      // Sign in existing user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      userId = data.user?.id

      if (!userId) {
        toast.error('Failed to authenticate')
        setLoading(false)
        return
      }

      // Existing user - join immediately
      await joinWedding(userId, inviteCode)
    } else {
      // Sign up new user
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/join?code=${inviteCode}`,
        },
      })

      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }

      // New user needs email confirmation - show message
      setLoading(false)
      setAwaitingConfirmation(true)
    }
  }

  // Show loading state while auto-joining
  if (autoJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Joining wedding...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show confirmation message after new signup
  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a confirmation link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground space-y-2">
            <p>Click the link in the email to confirm your account.</p>
            <p>Once confirmed, you&apos;ll be automatically added to the wedding.</p>
            <p className="mt-4">Didn&apos;t receive it? Check your spam folder.</p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button variant="outline" className="w-full" onClick={() => setAwaitingConfirmation(false)}>
              Try a different email
            </Button>
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Already have an account? Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join a Wedding</CardTitle>
          <CardDescription>
            {codeFromUrl 
              ? "You've been invited! Create an account or sign in to join."
              : "Enter your invite code to join a wedding plan"
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleJoin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                type="text"
                placeholder="e.g., CG2026X"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="uppercase tracking-widest text-center font-mono"
                required
              />
              {codeFromUrl && (
                <p className="text-xs text-muted-foreground text-center">
                  Pre-filled from your invite link
                </p>
              )}
            </div>

            <Tabs value={hasAccount ? 'signin' : 'signup'} onValueChange={(v) => setHasAccount(v === 'signin')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signup">New Account</TabsTrigger>
                <TabsTrigger value="signin">Existing Account</TabsTrigger>
              </TabsList>
              <TabsContent value="signup" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="How should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </TabsContent>
              <TabsContent value="signin" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Joining...' : 'Join Wedding'}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Want to create your own wedding?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </CardContent>
        </Card>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
