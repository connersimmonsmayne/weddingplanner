'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { WeddingEvent } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, PartyPopper, Calendar, MapPin, DollarSign } from 'lucide-react'

const EVENT_TYPES = [
  { value: 'rehearsal-dinner', label: 'Rehearsal Dinner' },
  { value: 'bachelor-party', label: 'Bachelor Party' },
  { value: 'bachelorette-party', label: 'Bachelorette Party' },
  { value: 'bridal-shower', label: 'Bridal Shower' },
  { value: 'engagement-party', label: 'Engagement Party' },
  { value: 'welcome-party', label: 'Welcome Party' },
  { value: 'day-after-brunch', label: 'Day-After Brunch' },
  { value: 'other', label: 'Other' },
] as const

export default function EventsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [events, setEvents] = useState<WeddingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<WeddingEvent | null>(null)
  const [formData, setFormData] = useState({
    event_type: 'rehearsal-dinner',
    title: '',
    event_date: '',
    location: '',
    budget: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const fetchEvents = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('event_date')

      if (error) {
        toast.error('Failed to load events')
        console.error(error)
      } else {
        setEvents(data || [])
      }
      setLoading(false)
    }

    fetchEvents()
  }, [wedding?.id])

  const handleOpenDialog = (event?: WeddingEvent) => {
    if (event) {
      setEditingEvent(event)
      setFormData({
        event_type: event.event_type,
        title: event.title || '',
        event_date: event.event_date || '',
        location: event.location || '',
        budget: event.budget?.toString() || '',
        notes: event.notes || '',
      })
    } else {
      setEditingEvent(null)
      setFormData({
        event_type: 'rehearsal-dinner',
        title: '',
        event_date: '',
        location: '',
        budget: '',
        notes: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!wedding?.id) return

    setSaving(true)

    const eventData = {
      event_type: formData.event_type,
      title: formData.title || EVENT_TYPES.find(t => t.value === formData.event_type)?.label || null,
      event_date: formData.event_date || null,
      location: formData.location || null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      notes: formData.notes || null,
    }

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id)

      if (error) {
        toast.error('Failed to update event')
      } else {
        setEvents(events.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e))
        toast.success('Event updated')
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('events')
        .insert({ ...eventData, wedding_id: wedding.id })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add event')
      } else {
        setEvents([...events, data])
        toast.success('Event added')
        setDialogOpen(false)
      }
    }

    setSaving(false)
  }

  const handleDelete = async (event: WeddingEvent) => {
    if (!confirm(`Delete ${event.title || event.event_type}?`)) return

    const { error } = await supabase.from('events').delete().eq('id', event.id)

    if (error) {
      toast.error('Failed to delete event')
    } else {
      setEvents(events.filter(e => e.id !== event.id))
      toast.success('Event deleted')
    }
  }

  const getEventLabel = (type: string) => {
    return EVENT_TYPES.find(t => t.value === type)?.label || type
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading events...</div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <PartyPopper className="h-8 w-8" />
            Events
          </h1>
          <p className="text-muted-foreground">
            Manage rehearsal dinner, parties, and other events
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Event
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
              <DialogDescription>
                {editingEvent ? 'Update event details' : 'Add a wedding-related event'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Event Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Custom Title (optional)</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={getEventLabel(formData.event_type)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Budget ($)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Venue or address"
                />
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional details, guest list notes, etc."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editingEvent ? 'Update' : 'Add Event')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <PartyPopper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No events yet.</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{event.title || getEventLabel(event.event_type)}</CardTitle>
                    <CardDescription>{getEventLabel(event.event_type)}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {event.event_date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(event.event_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.budget && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      ${event.budget.toLocaleString()} budget
                    </div>
                  )}
                  {event.notes && (
                    <p className="mt-3 text-muted-foreground">{event.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
