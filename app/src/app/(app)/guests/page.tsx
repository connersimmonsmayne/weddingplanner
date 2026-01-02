'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Guest } from '@/types/database'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Users, Upload } from 'lucide-react'
import { CSVUploadDialog } from '@/components/ui/csv-upload-dialog'

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

export default function GuestsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRsvp, setFilterRsvp] = useState<string>('all')
  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
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

  const handleOpenDialog = (guest?: Guest) => {
    if (guest) {
      setEditingGuest(guest)
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
    } else {
      setEditingGuest(null)
      setFormData(emptyFormData)
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!wedding?.id || !formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    setSaving(true)

    if (editingGuest) {
      // Update existing guest
      const { error } = await supabase
        .from('guests')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGuest.id)

      if (error) {
        toast.error('Failed to update guest')
        console.error(error)
      } else {
        setGuests(guests.map(g => g.id === editingGuest.id ? { ...g, ...formData } : g))
        toast.success('Guest updated')
        setDialogOpen(false)
      }
    } else {
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
        setDialogOpen(false)
      }
    }

    setSaving(false)
  }

  const handleDelete = async (guest: Guest) => {
    if (!confirm(`Are you sure you want to remove ${guest.name}?`)) return

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guest.id)

    if (error) {
      toast.error('Failed to delete guest')
      console.error(error)
    } else {
      setGuests(guests.filter(g => g.id !== guest.id))
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
      setGuests(guests.map(g => g.id === guest.id ? { ...g, rsvp_status: status } : g))
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Guest List
          </h1>
          <p className="text-muted-foreground">
            {stats.total} guests • {stats.confirmed} confirmed • {stats.pending} pending • {stats.declined} declined
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCsvDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Guest
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGuest ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
              <DialogDescription>
                {editingGuest ? 'Update guest information' : 'Add a new guest to your list'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Guest name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="group">Group</Label>
                  <Input
                    id="group"
                    value={formData.group_name}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    placeholder="e.g., Bride's Family"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="relationship">Relationship</Label>
                  <Input
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    placeholder="e.g., Cousin"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
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
                <div className="grid gap-2">
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
              <div className="grid gap-2">
                <Label htmlFor="plus_one">Plus One</Label>
                <Input
                  id="plus_one"
                  value={formData.plus_one}
                  onChange={(e) => setFormData({ ...formData, plus_one: e.target.value })}
                  placeholder="Plus one name or 'Yes'/'No'"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Mailing address"
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dietary">Dietary Restrictions</Label>
                <Input
                  id="dietary"
                  value={formData.dietary_restrictions}
                  onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                  placeholder="e.g., Vegetarian, Gluten-free"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingGuest ? 'Update' : 'Add Guest')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* CSV Upload Dialog */}
      <CSVUploadDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
        weddingId={wedding.id}
        existingGuests={guests.map(g => ({ name: g.name }))}
        onSuccess={fetchGuests}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRsvp} onValueChange={setFilterRsvp}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="RSVP Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RSVPs</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[180px]">
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

      {/* Guest Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Group</TableHead>
              <TableHead className="hidden sm:table-cell">Relationship</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead className="hidden lg:table-cell">Plus One</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {guests.length === 0 ? 'No guests yet. Add your first guest!' : 'No guests match your filters.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell className="font-medium">
                    {guest.name}
                    {guest.notes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {guest.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{guest.group_name || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{guest.relationship || '-'}</TableCell>
                  <TableCell>
                    <Select
                      value={guest.rsvp_status}
                      onValueChange={(value: 'pending' | 'confirmed' | 'declined') => 
                        handleQuickRsvp(guest, value)
                      }
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <Badge 
                          variant={
                            guest.rsvp_status === 'confirmed' ? 'default' :
                            guest.rsvp_status === 'declined' ? 'destructive' : 'secondary'
                          }
                          className="capitalize"
                        >
                          {guest.rsvp_status}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {RSVP_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{guest.plus_one || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(guest)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(guest)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
