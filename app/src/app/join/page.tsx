'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

export default function JoinPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // First, authenticate the user
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
    } else {
      // Sign up new user
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        toast.error(error.message)
        setLoading(false)
        return
      }
      userId = data.user?.id
    }

    if (!userId) {
      toast.error('Failed to authenticate')
      setLoading(false)
      return
    }

    // Find wedding by invite code
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase())
      .single()

    if (weddingError || !wedding) {
      toast.error('Invalid invite code')
      setLoading(false)
      return
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
      router.push('/select')
      router.refresh()
      return
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
      setLoading(false)
      return
    }

    toast.success(`Welcome to ${wedding.name}!`)
    router.push('/select')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Join a Wedding</CardTitle>
          <CardDescription>Enter your invite code to join a wedding plan</CardDescription>
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
