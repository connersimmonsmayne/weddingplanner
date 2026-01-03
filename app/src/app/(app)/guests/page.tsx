'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Guest } from '@/types/database'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Users,
  Upload,
  X,
  Mail,
  MapPin,
  UtensilsCrossed,
  UserPlus,
  Tag,
  Heart,
  Trash2
} from 'lucide-react'
import { CSVUploadDialog } from '@/components/ui/csv-upload-dialog'
import { cn } from '@/lib/utils'

const RSVP_OPTIONS = ['pending', 'confirmed', 'declined'] as const
const PRIORITY_OPTIONS = ['Must Invite', 'Like to Invite', 'Maybe'] as const

interface GuestFormData {
  name: string
  group_name: string
  relationship: string
  priority: string
  plus_one: string
  address: string
  notes: string
  rsvp_status: 'pending' | 'confirmed' | 'declined'
  dietary_restrictions: string
}

const emptyFormData: GuestFormData = {
  name: '',
  group_name: '',
  relationship: '',
  priority: 'Must Invite',
  plus_one: '',
  address: '',
  notes: '',
  rsvp_status: 'pending',
  dietary_restrictions: '',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRsvpBadgeVariant(status: string): 'success' | 'warning' | 'destructive' {
  switch (status) {
    case 'confirmed': return 'success'
    case 'declined': return 'destructive'
    default: return 'warning'
  }
}

export default function GuestsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRsvp, setFilterRsvp] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [formData, setFormData] = useState<GuestFormData>(emptyFormData)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return
    fetchGuests()
  }, [wedding?.id])

  const fetchGuests = async () => {
    if (!wedding?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('wedding_id', wedding.id)
      .order('name')

    if (error) {
      toast.error('Failed to load guests')
      console.error(error)
    } else {
      setGuests(data || [])
    }
    setLoading(false)
  }

  const uniqueGroups = [...new Set(guests.map(g => g.group_name).filter(Boolean))]

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.relationship?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRsvp = filterRsvp === 'all' || guest.rsvp_status === filterRsvp
    const matchesGroup = filterGroup === 'all' || guest.group_name === filterGroup

    return matchesSearch && matchesRsvp && matchesGroup
  })

  const handleSelectGuest = (guest: Guest) => {
    setSelectedGuest(guest)
    setIsEditing(false)
    setIsCreating(false)
    setFormData({
      name: guest.name,
      group_name: guest.group_name || '',
      relationship: guest.relationship || '',
      priority: guest.priority || 'Must Invite',
      plus_one: guest.plus_one || '',
      address: guest.address || '',
      notes: guest.notes || '',
      rsvp_status: guest.rsvp_status,
      dietary_restrictions: guest.dietary_restrictions || '',
    })
  }

  const handleStartCreate = () => {
    setSelectedGuest(null)
    setIsEditing(false)
    setIsCreating(true)
    setFormData(emptyFormData)
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (isCreating) {
      setIsCreating(false)
      setSelectedGuest(null)
    } else if (selectedGuest) {
      setIsEditing(false)
      // Reset form to selected guest data
      setFormData({
        name: selectedGuest.name,
        group_name: selectedGuest.group_name || '',
        relationship: selectedGuest.relationship || '',
        priority: selectedGuest.priority || 'Must Invite',
        plus_one: selectedGuest.plus_one || '',
        address: selectedGuest.address || '',
        notes: selectedGuest.notes || '',
        rsvp_status: selectedGuest.rsvp_status,
        dietary_restrictions: selectedGuest.dietary_restrictions || '',
      })
    }
  }

  const handleClosePanel = () => {
    setSelectedGuest(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!wedding?.id || !formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    if (isCreating) {
      // Create new guest
      const { data, error } = await supabase
        .from('guests')
        .insert({
          ...formData,
          wedding_id: wedding.id,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add guest')
        console.error(error)
      } else {
        setGuests([...guests, data])
        toast.success('Guest added')
        setIsCreating(false)
        setSelectedGuest(data)
      }
    } else if (selectedGuest) {
      // Update existing guest
      const { error } = await supabase
        .from('guests')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedGuest.id)

      if (error) {
        toast.error('Failed to update guest')
        console.error(error)
      } else {
        const updatedGuest = { ...selectedGuest, ...formData }
        setGuests(guests.map(g => g.id === selectedGuest.id ? updatedGuest : g))
        setSelectedGuest(updatedGuest)
        toast.success('Guest updated')
        setIsEditing(false)
      }
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedGuest) return
    if (!confirm(`Are you sure you want to remove ${selectedGuest.name}?`)) return

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', selectedGuest.id)

    if (error) {
      toast.error('Failed to delete guest')
      console.error(error)
    } else {
      setGuests(guests.filter(g => g.id !== selectedGuest.id))
      setSelectedGuest(null)
      setIsEditing(false)
      toast.success('Guest removed')
    }
  }

  const handleQuickRsvp = async (guest: Guest, status: 'pending' | 'confirmed' | 'declined') => {
    const { error } = await supabase
      .from('guests')
      .update({ rsvp_status: status, updated_at: new Date().toISOString() })
      .eq('id', guest.id)

    if (error) {
      toast.error('Failed to update RSVP')
    } else {
      const updatedGuest = { ...guest, rsvp_status: status }
      setGuests(guests.map(g => g.id === guest.id ? updatedGuest : g))
      if (selectedGuest?.id === guest.id) {
        setSelectedGuest(updatedGuest)
        setFormData({ ...formData, rsvp_status: status })
      }
      toast.success(`RSVP updated to ${status}`)
    }
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading guests...</div>
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

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === 'confirmed').length,
    pending: guests.filter(g => g.rsvp_status === 'pending').length,
    declined: guests.filter(g => g.rsvp_status === 'declined').length,
  }

  const showDetailPanel = selectedGuest || isCreating

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      {/* Header */}
      <PageHeader
        title="Guests"
        count={stats.total}
        countLabel={`guests • ${stats.confirmed} confirmed • ${stats.pending} pending`}
      >
        <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)}>
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Import</span>
        </Button>
        <Button size="sm" onClick={handleStartCreate}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Add Guest</span>
        </Button>
      </PageHeader>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        weddingId={wedding.id}
        existingGuests={guests.map(g => ({ name: g.name }))}
        onSuccess={fetchGuests}
      />

      {/* Main Content - List + Detail Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden min-w-0">
        {/* Guest List Panel */}
        <div className={cn(
          "flex flex-col min-h-0 overflow-hidden min-w-0",
          showDetailPanel ? "hidden lg:flex lg:w-[360px]" : "flex-1"
        )}>
          {/* Search & Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterRsvp} onValueChange={setFilterRsvp}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="RSVP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All RSVPs</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGroup} onValueChange={setFilterGroup}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {uniqueGroups.map((group) => (
                    <SelectItem key={group} value={group!}>{group}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Guest List */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-y-auto">
              {filteredGuests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {guests.length === 0 ? 'No guests yet' : 'No guests match your filters'}
                  </p>
                  {guests.length === 0 && (
                    <Button variant="outline" className="mt-4" onClick={handleStartCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first guest
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredGuests.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => handleSelectGuest(guest)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors min-w-0",
                        selectedGuest?.id === guest.id && "bg-primary/5"
                      )}
                    >
                      {/* Avatar */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(guest.name)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{guest.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {guest.group_name || guest.relationship || 'No group'}
                        </div>
                      </div>

                      {/* RSVP Badge */}
                      <Badge
                        variant={getRsvpBadgeVariant(guest.rsvp_status)}
                        className="capitalize flex-shrink-0"
                      >
                        {guest.rsvp_status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail Panel */}
        {showDetailPanel && (
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
            {/* Detail Header */}
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {isCreating ? 'New Guest' : (isEditing ? 'Edit Guest' : 'Guest Details')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!isCreating && !isEditing && selectedGuest && (
                    <>
                      <Button variant="outline" size="sm" onClick={handleStartEdit}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={handleClosePanel}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Detail Content */}
            <CardContent className="flex-1 overflow-y-auto p-6">
              {(isEditing || isCreating) ? (
                /* Edit/Create Form */
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Guest name"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="group">Group</Label>
                      <Input
                        id="group"
                        value={formData.group_name}
                        onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                        placeholder="e.g., Bride's Family"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="relationship">Relationship</Label>
                      <Input
                        id="relationship"
                        value={formData.relationship}
                        onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                        placeholder="e.g., Cousin"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rsvp">RSVP Status</Label>
                      <Select
                        value={formData.rsvp_status}
                        onValueChange={(value: 'pending' | 'confirmed' | 'declined') =>
                          setFormData({ ...formData, rsvp_status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RSVP_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plus_one">Plus One</Label>
                    <Input
                      id="plus_one"
                      value={formData.plus_one}
                      onChange={(e) => setFormData({ ...formData, plus_one: e.target.value })}
                      placeholder="Plus one name or 'Yes'/'No'"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Mailing address"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dietary">Dietary Restrictions</Label>
                    <Input
                      id="dietary"
                      value={formData.dietary_restrictions}
                      onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                      placeholder="e.g., Vegetarian, Gluten-free"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : (isCreating ? 'Add Guest' : 'Save Changes')}
                    </Button>
                  </div>
                </div>
              ) : selectedGuest ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xl font-semibold text-primary">
                        {getInitials(selectedGuest.name)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedGuest.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={getRsvpBadgeVariant(selectedGuest.rsvp_status)}
                          className="capitalize"
                        >
                          {selectedGuest.rsvp_status}
                        </Badge>
                        {selectedGuest.priority && (
                          <Badge variant="outline">{selectedGuest.priority}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick RSVP Update */}
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-3">Quick RSVP Update</p>
                    <div className="flex gap-2">
                      {RSVP_OPTIONS.map((status) => (
                        <Button
                          key={status}
                          variant={selectedGuest.rsvp_status === status ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1 capitalize"
                          onClick={() => handleQuickRsvp(selectedGuest, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-4">
                    {selectedGuest.group_name && (
                      <div className="flex items-start gap-3">
                        <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Group</p>
                          <p className="font-medium">{selectedGuest.group_name}</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.relationship && (
                      <div className="flex items-start gap-3">
                        <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Relationship</p>
                          <p className="font-medium">{selectedGuest.relationship}</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.plus_one && (
                      <div className="flex items-start gap-3">
                        <UserPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Plus One</p>
                          <p className="font-medium">{selectedGuest.plus_one}</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.address && (
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Address</p>
                          <p className="font-medium whitespace-pre-line">{selectedGuest.address}</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.dietary_restrictions && (
                      <div className="flex items-start gap-3">
                        <UtensilsCrossed className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Dietary Restrictions</p>
                          <p className="font-medium">{selectedGuest.dietary_restrictions}</p>
                        </div>
                      </div>
                    )}

                    {selectedGuest.notes && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="font-medium whitespace-pre-line">{selectedGuest.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Empty State - No selection on desktop */}
        {!showDetailPanel && (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <Card className="w-full max-w-md">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Select a guest from the list to view their details
                </p>
                <Button onClick={handleStartCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Guest
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
