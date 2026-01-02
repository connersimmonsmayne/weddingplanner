'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { WeddingMember } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Settings, Users, Copy, LogOut, Trash2, Crown, User } from 'lucide-react'

interface MemberWithEmail extends WeddingMember {
  email?: string
}

export default function SettingsPage() {
  const { wedding, membership, isAdmin, loading: weddingLoading, refreshWedding } = useWedding()
  const [members, setMembers] = useState<MemberWithEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [weddingForm, setWeddingForm] = useState({
    name: '',
    partner1_name: '',
    partner2_name: '',
    wedding_date: '',
    budget: '',
    location: '',
  })
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    setWeddingForm({
      name: wedding.name,
      partner1_name: wedding.partner1_name,
      partner2_name: wedding.partner2_name,
      wedding_date: wedding.wedding_date || '',
      budget: wedding.budget?.toString() || '',
      location: wedding.location || '',
    })

    const fetchMembers = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .rpc('get_wedding_members', { p_wedding_id: wedding.id })

      if (error) {
        toast.error('Failed to load members')
      } else {
        setMembers(data || [])
      }
      setLoading(false)
    }

    fetchMembers()
  }, [wedding?.id])

  const handleSaveSettings = async () => {
    if (!wedding?.id) return

    setSaving(true)

    const { error } = await supabase
      .from('weddings')
      .update({
        name: weddingForm.name,
        partner1_name: weddingForm.partner1_name,
        partner2_name: weddingForm.partner2_name,
        wedding_date: weddingForm.wedding_date || null,
        budget: weddingForm.budget ? parseFloat(weddingForm.budget) : null,
        location: weddingForm.location || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wedding.id)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved!')
      refreshWedding()
    }

    setSaving(false)
  }

  const handleCopyInviteLink = () => {
    if (wedding?.invite_code) {
      const inviteUrl = `${window.location.origin}/join?code=${wedding.invite_code}`
      navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied!')
    }
  }

  const handleRemoveMember = async (member: MemberWithEmail) => {
    if (member.role === 'admin') {
      toast.error('Cannot remove an admin')
      return
    }

    if (!confirm(`Remove ${member.display_name || 'this member'} from the wedding?`)) return

    const { error } = await supabase
      .from('wedding_members')
      .delete()
      .eq('id', member.id)

    if (error) {
      toast.error('Failed to remove member')
    } else {
      setMembers(members.filter(m => m.id !== member.id))
      toast.success('Member removed')
    }
  }

  const handleDeleteWedding = async () => {
    if (!wedding?.id || !isAdmin) return

    const { error } = await supabase
      .from('weddings')
      .delete()
      .eq('id', wedding.id)

    if (error) {
      toast.error('Failed to delete wedding')
    } else {
      toast.success('Wedding deleted')
      router.push('/select')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading settings...</div>
      </div>
    )
  }

  if (!wedding) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No wedding selected</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your wedding settings and members
        </p>
      </div>

      {/* Wedding Details */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Details</CardTitle>
          <CardDescription>Update your wedding information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Wedding Name</Label>
            <Input
              value={weddingForm.name}
              onChange={(e) => setWeddingForm({ ...weddingForm, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Partner 1 Name</Label>
              <Input
                value={weddingForm.partner1_name}
                onChange={(e) => setWeddingForm({ ...weddingForm, partner1_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Partner 2 Name</Label>
              <Input
                value={weddingForm.partner2_name}
                onChange={(e) => setWeddingForm({ ...weddingForm, partner2_name: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Wedding Date</Label>
              <Input
                type="date"
                value={weddingForm.wedding_date}
                onChange={(e) => setWeddingForm({ ...weddingForm, wedding_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Budget ($)</Label>
              <Input
                type="number"
                value={weddingForm.budget}
                onChange={(e) => setWeddingForm({ ...weddingForm, budget: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Location</Label>
            <Input
              value={weddingForm.location}
              onChange={(e) => setWeddingForm({ ...weddingForm, location: e.target.value })}
              placeholder="e.g., St. Louis, MO"
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Invite Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Invite Partner
          </CardTitle>
          <CardDescription>
            Share this code with your partner to give them access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 p-4 rounded-lg bg-muted font-mono text-2xl text-center tracking-widest">
              {wedding.invite_code}
            </div>
            <Button onClick={handleCopyInviteLink} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Share this link with your partner to give them access
          </p>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>People with access to this wedding</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  {member.role === 'admin' ? (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{member.display_name || 'Member'}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {isAdmin && member.role !== 'admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              These actions are irreversible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Wedding
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Wedding</DialogTitle>
                  <DialogDescription>
                    This will permanently delete &quot;{wedding.name}&quot; and all associated data including guests, budget, vendors, and more. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteWedding}>
                    Delete Forever
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
