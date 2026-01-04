'use client'

import React, { useEffect, useState, useMemo, Fragment } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Users,
  Upload,
  Download,
  X,
  Mail,
  MapPin,
  UtensilsCrossed,
  UserPlus,
  Tag,
  Heart,
  Trash2,
  Baby,
  CheckCircle2,
  Clock,
  XCircle,
  List,
  LayoutGrid
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
  is_child: boolean
  parent_id: string
  partner_id: string
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
  is_child: false,
  parent_id: '',
  partner_id: '',
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

function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'Must Invite': return 'bg-green-500'
    case 'Like to Invite': return 'bg-yellow-500'
    case 'Maybe': return 'bg-gray-400'
    default: return 'bg-gray-300'
  }
}

function getLastName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  return parts[parts.length - 1] || fullName
}

export default function GuestsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRsvp, setFilterRsvp] = useState<string>('all')
  const [filterSide, setFilterSide] = useState<string>('all')
  const [filterRelationship, setFilterRelationship] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('last-name-asc')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [formData, setFormData] = useState<GuestFormData>(emptyFormData)
  const [saving, setSaving] = useState(false)
  const [groupByFamily, setGroupByFamily] = useState(true)
  const [showKids, setShowKids] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'table'>('table')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAddingPartner, setIsAddingPartner] = useState(false)
  const [newPartnerName, setNewPartnerName] = useState('')
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

  const uniqueRelationships = [...new Set(guests.map(g => g.relationship).filter(Boolean))]

  // Get adult guests for parent dropdown, sorted by same last name first
  // Returns couples as single options and individual adults
  const getParentOptions = (currentGuestName: string, currentGuestId?: string) => {
    const adults = guests.filter(g => !g.is_child && g.id !== currentGuestId)
    const currentLastName = getLastName(currentGuestName)
    const processedIds = new Set<string>()
    const options: { id: string; label: string; isCouple: boolean }[] = []

    adults.forEach(adult => {
      if (processedIds.has(adult.id)) return

      // Check if this adult has a partner
      const partner = adult.partner_id ? adults.find(g => g.id === adult.partner_id) : null

      if (partner && !processedIds.has(partner.id)) {
        // This is a couple - show as single option
        const firstName1 = adult.name.split(' ')[0]
        const firstName2 = partner.name.split(' ')[0]
        const lastName = getLastName(adult.name)
        options.push({
          id: adult.id, // Use first partner's ID as the parent_id
          label: `${firstName1} & ${firstName2} ${lastName}`,
          isCouple: true,
        })
        processedIds.add(adult.id)
        processedIds.add(partner.id)
      } else if (!partner) {
        // Single adult
        options.push({
          id: adult.id,
          label: adult.name,
          isCouple: false,
        })
        processedIds.add(adult.id)
      }
    })

    // Sort: same last name first, then alphabetically
    return options.sort((a, b) => {
      const aLastName = getLastName(a.label)
      const bLastName = getLastName(b.label)
      const aMatch = aLastName === currentLastName
      const bMatch = bLastName === currentLastName

      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return a.label.localeCompare(b.label)
    })
  }

  // Get adult guests for partner dropdown (exclude current guest and children)
  const getPartnerOptions = (currentGuestId: string, currentGuestName: string) => {
    const adults = guests.filter(g => !g.is_child && g.id !== currentGuestId)
    const currentLastName = getLastName(currentGuestName)

    return adults.sort((a, b) => {
      const aLastName = getLastName(a.name)
      const bLastName = getLastName(b.name)
      const aMatch = aLastName === currentLastName
      const bMatch = bLastName === currentLastName

      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return a.name.localeCompare(b.name)
    })
  }

  const sideOptions = wedding ? [
    { value: `${wedding.partner1_name.split(' ')[0]}'s Side`, label: `${wedding.partner1_name}'s Side` },
    { value: `${wedding.partner2_name.split(' ')[0]}'s Side`, label: `${wedding.partner2_name}'s Side` },
    { value: 'Shared', label: 'Shared' },
  ] : []

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.relationship?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.notes?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRsvp = filterRsvp === 'all' || guest.rsvp_status === filterRsvp
    const matchesSide = filterSide === 'all' || guest.group_name?.startsWith(filterSide)
    const matchesRelationship = filterRelationship === 'all' || guest.relationship === filterRelationship
    const matchesPriority = filterPriority === 'all' || guest.priority === filterPriority
    const matchesKids = showKids || !guest.is_child

    return matchesSearch && matchesRsvp && matchesSide && matchesRelationship && matchesPriority && matchesKids
  })

  const sortedGuests = useMemo(() => {
    return [...filteredGuests].sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return b.name.localeCompare(a.name)
        case 'last-name-asc': return getLastName(a.name).localeCompare(getLastName(b.name))
        case 'last-name-desc': return getLastName(b.name).localeCompare(getLastName(a.name))
        case 'rsvp':
          const order: Record<string, number> = { confirmed: 0, pending: 1, declined: 2 }
          return order[a.rsvp_status] - order[b.rsvp_status]
        default: return a.name.localeCompare(b.name) // name-asc
      }
    })
  }, [filteredGuests, sortBy])

  const groupedByFamily = useMemo(() => {
    // Build parent-to-children mapping
    const parentToChildren: Record<string, Guest[]> = {}

    sortedGuests.forEach(guest => {
      if (guest.is_child && guest.parent_id) {
        if (!parentToChildren[guest.parent_id]) {
          parentToChildren[guest.parent_id] = []
        }
        parentToChildren[guest.parent_id].push(guest)
      }
    })

    // Build family groups using ONLY partner_id relationships
    const result: { family: string, members: Guest[], key: string }[] = []
    const processedAdults = new Set<string>()
    const processedKids = new Set<string>()

    // Group adults by partner relationships
    sortedGuests.forEach(guest => {
      if (guest.is_child || processedAdults.has(guest.id)) return

      // Check if this adult has a partner via partner_id
      const partner = guest.partner_id
        ? sortedGuests.find(g => g.id === guest.partner_id && !g.is_child)
        : null

      const parents = partner ? [guest, partner] : [guest]

      // Collect kids linked to either parent
      const allKids: Guest[] = []
      parents.forEach(parent => {
        const kids = parentToChildren[parent.id] || []
        kids.forEach(kid => {
          if (!allKids.find(k => k.id === kid.id)) {
            allKids.push(kid)
            processedKids.add(kid.id)
          }
        })
      })

      // Build family name based on relationships
      const lastName = getLastName(parents[0].name)
      let familyName: string

      if (allKids.length > 0) {
        // Has kids - use "Parent1 and Parent2 LastName Family" format
        if (parents.length === 2) {
          const firstName1 = parents[0].name.split(' ')[0]
          const firstName2 = parents[1].name.split(' ')[0]
          familyName = `${firstName1} and ${firstName2} ${lastName} Family`
        } else {
          familyName = `${parents[0].name} Family`
        }
      } else if (parents.length === 2) {
        // Couple without kids
        const firstName1 = parents[0].name.split(' ')[0]
        const firstName2 = parents[1].name.split(' ')[0]
        familyName = `${firstName1} and ${firstName2} ${lastName}`
      } else {
        // Single adult - just their name
        familyName = guest.name
      }

      const members = [...parents, ...allKids]
      const key = guest.id + (partner ? `-${partner.id}` : '')
      result.push({ family: familyName, members, key })

      processedAdults.add(guest.id)
      if (partner) processedAdults.add(partner.id)
    })

    // Add unlinked kids as individuals
    sortedGuests.forEach(guest => {
      if (guest.is_child && !processedKids.has(guest.id)) {
        result.push({
          family: guest.name,
          members: [guest],
          key: guest.id
        })
      }
    })

    // Sort family groups by last name, respecting sort direction
    return result.sort((a, b) => {
      const aLastName = getLastName(a.family.replace(' Family', ''))
      const bLastName = getLastName(b.family.replace(' Family', ''))

      if (sortBy === 'last-name-desc') {
        return bLastName.localeCompare(aLastName)
      }
      return aLastName.localeCompare(bLastName)
    })
  }, [sortedGuests, sortBy])

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
      is_child: guest.is_child || false,
      parent_id: guest.parent_id || '',
      partner_id: guest.partner_id || '',
    })
  }

  const handleStartCreate = () => {
    setSelectedGuest(null)
    setIsEditing(false)
    setIsCreating(true)
    setFormData(emptyFormData)
  }

  const handleAddChildToFamily = (parent: Guest) => {
    setSelectedGuest(null)
    setIsEditing(false)
    setIsCreating(true)
    setFormData({
      ...emptyFormData,
      is_child: true,
      parent_id: parent.id,
      group_name: parent.group_name || '',
      priority: 'Maybe',
    })
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
        is_child: selectedGuest.is_child || false,
        parent_id: selectedGuest.parent_id || '',
        partner_id: selectedGuest.partner_id || '',
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

    // Convert empty IDs to null for database
    const dataToSave = {
      ...formData,
      parent_id: formData.parent_id || null,
      partner_id: formData.partner_id || null,
    }

    if (isCreating) {
      // Create new guest
      const { data, error } = await supabase
        .from('guests')
        .insert({
          id: crypto.randomUUID(),
          ...dataToSave,
          wedding_id: wedding.id,
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add guest')
        console.error(error)
      } else {
        // Auto-link partner bidirectionally
        if (data.partner_id) {
          await supabase
            .from('guests')
            .update({ partner_id: data.id })
            .eq('id', data.partner_id)
          // Update local state for partner
          setGuests(prev => prev.map(g =>
            g.id === data.partner_id ? { ...g, partner_id: data.id } : g
          ))
        }
        setGuests(prev => [...prev, data])
        toast.success('Guest added')
        setIsCreating(false)
        setSelectedGuest(data)
      }
    } else if (selectedGuest) {
      // Update existing guest
      const { error } = await supabase
        .from('guests')
        .update({
          ...dataToSave,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedGuest.id)

      if (error) {
        toast.error('Failed to update guest')
        console.error(error)
      } else {
        const updatedGuest = { ...selectedGuest, ...formData }

        // Handle bidirectional partner linking
        const oldPartnerId = selectedGuest.partner_id
        const newPartnerId = formData.partner_id || null

        // If partner changed, update bidirectional links
        if (oldPartnerId !== newPartnerId) {
          // Remove old partner's link to this guest
          if (oldPartnerId) {
            await supabase
              .from('guests')
              .update({ partner_id: null })
              .eq('id', oldPartnerId)
          }
          // Add new partner's link to this guest
          if (newPartnerId) {
            await supabase
              .from('guests')
              .update({ partner_id: selectedGuest.id })
              .eq('id', newPartnerId)
          }
          // Update local state for partners
          setGuests(prev => prev.map(g => {
            if (g.id === oldPartnerId) return { ...g, partner_id: null }
            if (g.id === newPartnerId) return { ...g, partner_id: selectedGuest.id }
            if (g.id === selectedGuest.id) return updatedGuest
            return g
          }))
        } else {
          setGuests(guests.map(g => g.id === selectedGuest.id ? updatedGuest : g))
        }

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

  const handleQuickSide = async (guest: Guest, side: string) => {
    const { error } = await supabase
      .from('guests')
      .update({ group_name: side, updated_at: new Date().toISOString() })
      .eq('id', guest.id)

    if (error) {
      toast.error('Failed to update side')
    } else {
      const updatedGuest = { ...guest, group_name: side }
      setGuests(guests.map(g => g.id === guest.id ? updatedGuest : g))
      if (selectedGuest?.id === guest.id) {
        setSelectedGuest(updatedGuest)
        setFormData({ ...formData, group_name: side })
      }
      toast.success(`Side updated to ${side}`)
    }
  }

  const handleExport = () => {
    // CSV escape function - wraps in quotes and escapes internal quotes
    const escapeCSV = (value: string | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Helper to get guest name by ID
    const getGuestName = (id: string | null): string => {
      if (!id) return ''
      const guest = guests.find(g => g.id === id)
      return guest?.name || ''
    }

    // CSV header
    const headers = [
      'Name',
      'Side',
      'Relationship',
      'Priority',
      'RSVP Status',
      'Dietary Restrictions',
      'Address',
      'Plus One',
      'Notes',
      'Is Child',
      'Partner',
      'Parent'
    ]

    // CSV rows
    const rows = guests.map(guest => [
      escapeCSV(guest.name),
      escapeCSV(guest.group_name),
      escapeCSV(guest.relationship),
      escapeCSV(guest.priority),
      escapeCSV(guest.rsvp_status),
      escapeCSV(guest.dietary_restrictions),
      escapeCSV(guest.address),
      escapeCSV(guest.plus_one),
      escapeCSV(guest.notes),
      guest.is_child ? 'Yes' : 'No',
      escapeCSV(getGuestName(guest.partner_id)),
      escapeCSV(getGuestName(guest.parent_id))
    ])

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${wedding?.name || 'guests'}-guest-list.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${guests.length} guests to CSV`)
  }

  // Selection handlers
  const toggleSelection = (guestId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guestId)) {
        newSet.delete(guestId)
      } else {
        newSet.add(guestId)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedGuests.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedGuests.map(g => g.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  // Bulk action handlers
  const handleBulkRsvp = async (status: 'pending' | 'confirmed' | 'declined') => {
    if (selectedIds.size === 0) return

    const idsArray = Array.from(selectedIds)
    const { error } = await supabase
      .from('guests')
      .update({ rsvp_status: status, updated_at: new Date().toISOString() })
      .in('id', idsArray)

    if (error) {
      toast.error('Failed to update RSVP status')
      console.error(error)
    } else {
      setGuests(guests.map(g =>
        selectedIds.has(g.id) ? { ...g, rsvp_status: status } : g
      ))
      toast.success(`Updated ${selectedIds.size} guests to ${status}`)
      clearSelection()
    }
  }

  const handleBulkSide = async (side: string) => {
    if (selectedIds.size === 0) return

    const idsArray = Array.from(selectedIds)
    const { error } = await supabase
      .from('guests')
      .update({ group_name: side, updated_at: new Date().toISOString() })
      .in('id', idsArray)

    if (error) {
      toast.error('Failed to update side')
      console.error(error)
    } else {
      setGuests(guests.map(g =>
        selectedIds.has(g.id) ? { ...g, group_name: side } : g
      ))
      toast.success(`Updated ${selectedIds.size} guests to ${side}`)
      clearSelection()
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} guests? This cannot be undone.`)) return

    const idsArray = Array.from(selectedIds)
    const { error } = await supabase
      .from('guests')
      .delete()
      .in('id', idsArray)

    if (error) {
      toast.error('Failed to delete guests')
      console.error(error)
    } else {
      setGuests(guests.filter(g => !selectedIds.has(g.id)))
      if (selectedGuest && selectedIds.has(selectedGuest.id)) {
        setSelectedGuest(null)
      }
      toast.success(`Deleted ${selectedIds.size} guests`)
      clearSelection()
    }
  }

  const showDetailPanel = selectedGuest || isCreating

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

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      {/* Header */}
      <PageHeader
        title="Guests"
        count={guests.length}
        countLabel={`guests • ${guests.filter(g => g.rsvp_status === 'confirmed').length} confirmed • ${guests.filter(g => g.rsvp_status === 'pending').length} pending`}
      >
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Export</span>
        </Button>
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 mb-4 bg-primary/5 border border-primary/20 rounded-xl">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.size === sortedGuests.length && sortedGuests.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Set RSVP
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {RSVP_OPTIONS.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => handleBulkRsvp(status)}
                    className="capitalize"
                  >
                    {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                    {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                    {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                    {status}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Set Side
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {sideOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleBulkSide(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={handleBulkDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

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
              <Select value={filterSide} onValueChange={setFilterSide}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Side" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sides</SelectItem>
                  {sideOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRelationship} onValueChange={setFilterRelationship}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Relationships</SelectItem>
                  {uniqueRelationships.map((rel) => (
                    <SelectItem key={rel} value={rel!}>{rel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">First Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">First Name (Z-A)</SelectItem>
                  <SelectItem value="last-name-asc">Last Name (A-Z)</SelectItem>
                  <SelectItem value="last-name-desc">Last Name (Z-A)</SelectItem>
                  <SelectItem value="rsvp">RSVP Status</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch
                  id="group-by-family"
                  checked={groupByFamily}
                  onCheckedChange={setGroupByFamily}
                />
                <Label htmlFor="group-by-family" className="text-sm text-muted-foreground cursor-pointer">
                  Group by family
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="show-kids"
                  checked={showKids}
                  onCheckedChange={setShowKids}
                />
                <Label htmlFor="show-kids" className="text-sm text-muted-foreground cursor-pointer">
                  Show kids
                </Label>
              </div>
              {/* View Toggle */}
              <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === 'list' ? "bg-background shadow-sm" : "hover:bg-background/50"
                  )}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    viewMode === 'table' ? "bg-background shadow-sm" : "hover:bg-background/50"
                  )}
                  title="Table view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {sortedGuests.length} of {guests.length} guests
            </div>
          </div>

          {/* Guest List */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-y-auto">
              {sortedGuests.length === 0 ? (
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
              ) : viewMode === 'table' ? (
                /* Table View */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === sortedGuests.length && sortedGuests.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>RSVP</TableHead>
                      <TableHead>Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupByFamily ? (
                      /* Grouped Table View - Families first, then singles */
                      <>
                        {/* Families (2+ members) */}
                        {groupedByFamily.filter(g => g.members.length > 1).map(({ family, members, key }) => (
                          <React.Fragment key={key}>
                            <TableRow className="bg-muted/80 hover:bg-muted/80">
                              <TableCell colSpan={8} className="py-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-semibold text-sm">{family}</span>
                                    <span className="text-muted-foreground text-sm ml-2">({members.length})</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddChildToFamily(members.find(m => !m.is_child) || members[0])
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Child
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {members.map((guest) => (
                              <TableRow
                                key={guest.id}
                                className={cn(
                                  "cursor-pointer border-l-2 border-l-primary/30 bg-muted/30",
                                  selectedGuest?.id === guest.id && "bg-primary/5"
                                )}
                                onClick={() => handleSelectGuest(guest)}
                              >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <Checkbox
                                    checked={selectedIds.has(guest.id)}
                                    onCheckedChange={() => toggleSelection(guest.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    getPriorityColor(guest.priority)
                                  )} />
                                </TableCell>
                                <TableCell>
                                  <div className={cn("flex items-center gap-2", guest.is_child && "pl-6")}>
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-medium text-primary">
                                        {getInitials(guest.name)}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium">{guest.name}</span>
                                      {guest.is_child && (
                                        <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="focus:outline-none text-muted-foreground hover:text-foreground">
                                        {guest.group_name || 'Set side'}
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start">
                                      {sideOptions.map((option) => (
                                        <DropdownMenuItem
                                          key={option.value}
                                          onClick={() => handleQuickSide(guest, option.value)}
                                        >
                                          {option.label}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {guest.relationship || '-'}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm">{guest.priority || '-'}</span>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="focus:outline-none">
                                        <Badge
                                          variant={getRsvpBadgeVariant(guest.rsvp_status)}
                                          className="capitalize cursor-pointer hover:opacity-80"
                                        >
                                          {guest.rsvp_status}
                                        </Badge>
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {RSVP_OPTIONS.map((status) => (
                                        <DropdownMenuItem
                                          key={status}
                                          onClick={() => handleQuickRsvp(guest, status)}
                                          className="capitalize"
                                        >
                                          {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                                          {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                                          {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                                          {status}
                                        </DropdownMenuItem>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell>
                                  <TooltipProvider>
                                    <div className="flex items-center gap-1.5">
                                      {guest.dietary_restrictions && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span><UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" /></span>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Dietary restrictions</p></TooltipContent>
                                        </Tooltip>
                                      )}
                                      {guest.address && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span><MapPin className="h-3.5 w-3.5 text-blue-500" /></span>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Address on file</p></TooltipContent>
                                        </Tooltip>
                                      )}
                                      {guest.partner_id && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span><Heart className="h-3.5 w-3.5 text-pink-500" /></span>
                                          </TooltipTrigger>
                                          <TooltipContent><p>Partner linked</p></TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                  </TooltipProvider>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        ))}

                        {/* Singles section with header */}
                        {groupedByFamily.filter(g => g.members.length === 1).length > 0 && (
                          <>
                            <TableRow className="bg-muted/80 hover:bg-muted/80">
                              <TableCell colSpan={8} className="py-2">
                                <span className="font-semibold text-sm">Individual Guests</span>
                                <span className="text-muted-foreground text-sm ml-2">
                                  ({groupedByFamily.filter(g => g.members.length === 1).length})
                                </span>
                              </TableCell>
                            </TableRow>
                            {groupedByFamily.filter(g => g.members.length === 1).map(({ members, key }) => {
                              const guest = members[0]
                              return (
                                <TableRow
                                  key={key}
                                  className={cn(
                                    "cursor-pointer",
                                    selectedGuest?.id === guest.id && "bg-primary/5"
                                  )}
                                  onClick={() => handleSelectGuest(guest)}
                                >
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                      checked={selectedIds.has(guest.id)}
                                      onCheckedChange={() => toggleSelection(guest.id)}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className={cn(
                                      "w-2 h-2 rounded-full",
                                      getPriorityColor(guest.priority)
                                    )} />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-medium text-primary">
                                          {getInitials(guest.name)}
                                        </span>
                                      </div>
                                      <span className="font-medium">{guest.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="focus:outline-none text-muted-foreground hover:text-foreground">
                                          {guest.group_name || 'Set side'}
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start">
                                        {sideOptions.map((option) => (
                                          <DropdownMenuItem
                                            key={option.value}
                                            onClick={() => handleQuickSide(guest, option.value)}
                                          >
                                            {option.label}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {guest.relationship || '-'}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{guest.priority || '-'}</span>
                                  </TableCell>
                                  <TableCell onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="focus:outline-none">
                                          <Badge
                                            variant={getRsvpBadgeVariant(guest.rsvp_status)}
                                            className="capitalize cursor-pointer hover:opacity-80"
                                          >
                                            {guest.rsvp_status}
                                          </Badge>
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {RSVP_OPTIONS.map((status) => (
                                          <DropdownMenuItem
                                            key={status}
                                            onClick={() => handleQuickRsvp(guest, status)}
                                            className="capitalize"
                                          >
                                            {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                                            {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                                            {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                                            {status}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                  <TableCell>
                                    <TooltipProvider>
                                      <div className="flex items-center gap-1.5">
                                        {guest.dietary_restrictions && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span><UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" /></span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Dietary restrictions</p></TooltipContent>
                                          </Tooltip>
                                        )}
                                        {guest.address && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span><MapPin className="h-3.5 w-3.5 text-blue-500" /></span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Address on file</p></TooltipContent>
                                          </Tooltip>
                                        )}
                                        {guest.partner_id && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span><Heart className="h-3.5 w-3.5 text-pink-500" /></span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Partner linked</p></TooltipContent>
                                          </Tooltip>
                                        )}
                                        {guest.plus_one && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span><UserPlus className="h-3.5 w-3.5 text-purple-500" /></span>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Has plus one</p></TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </TooltipProvider>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </>
                        )}
                      </>
                    ) : (
                      /* Flat Table View */
                      sortedGuests.map((guest) => (
                        <TableRow
                          key={guest.id}
                          className={cn(
                            "cursor-pointer",
                            selectedGuest?.id === guest.id && "bg-primary/5"
                          )}
                          onClick={() => handleSelectGuest(guest)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(guest.id)}
                              onCheckedChange={() => toggleSelection(guest.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              getPriorityColor(guest.priority)
                            )} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-primary">
                                  {getInitials(guest.name)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{guest.name}</span>
                                {guest.is_child && (
                                  <Baby className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none text-muted-foreground hover:text-foreground">
                                  {guest.group_name || 'Set side'}
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                {sideOptions.map((option) => (
                                  <DropdownMenuItem
                                    key={option.value}
                                    onClick={() => handleQuickSide(guest, option.value)}
                                  >
                                    {option.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {guest.relationship || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{guest.priority || '-'}</span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none">
                                  <Badge
                                    variant={getRsvpBadgeVariant(guest.rsvp_status)}
                                    className="capitalize cursor-pointer hover:opacity-80"
                                  >
                                    {guest.rsvp_status}
                                  </Badge>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {RSVP_OPTIONS.map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => handleQuickRsvp(guest, status)}
                                    className="capitalize"
                                  >
                                    {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                                    {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                                    {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex items-center gap-1.5">
                                {guest.dietary_restrictions && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span><UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Dietary restrictions</p></TooltipContent>
                                  </Tooltip>
                                )}
                                {guest.address && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span><MapPin className="h-3.5 w-3.5 text-blue-500" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Address on file</p></TooltipContent>
                                  </Tooltip>
                                )}
                                {guest.partner_id && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span><Heart className="h-3.5 w-3.5 text-pink-500" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Partner linked</p></TooltipContent>
                                  </Tooltip>
                                )}
                                {guest.plus_one && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span><UserPlus className="h-3.5 w-3.5 text-purple-500" /></span>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Has plus one</p></TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : groupByFamily ? (
                /* Grouped by Family View - Families first, then singles */
                <div>
                  {/* Families (2+ members) */}
                  {groupedByFamily.filter(g => g.members.length > 1).map(({ family, members, key }) => (
                    <div key={key}>
                      <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-sm">{family}</span>
                          <span className="text-muted-foreground text-sm ml-2">({members.length})</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddChildToFamily(members.find(m => !m.is_child) || members[0])
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Child
                        </Button>
                      </div>
                      <div className="divide-y border-l-2 border-l-primary/30 bg-muted/30">
                        {members.map((guest) => (
                          <div
                            key={guest.id}
                            className={cn(
                              "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors min-w-0",
                              selectedGuest?.id === guest.id && "bg-primary/5",
                              guest.is_child && "pl-8"
                            )}
                          >
                            <Checkbox
                              checked={selectedIds.has(guest.id)}
                              onCheckedChange={() => toggleSelection(guest.id)}
                              className="flex-shrink-0"
                            />
                            <button
                              onClick={() => handleSelectGuest(guest)}
                              className="flex items-center gap-3 flex-1 min-w-0 text-left"
                            >
                              <div className={cn(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                getPriorityColor(guest.priority)
                              )} />
                              <div className={cn(
                                "flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
                                guest.is_child ? "w-8 h-8" : "w-10 h-10"
                              )}>
                                <span className={cn(
                                  "font-medium text-primary",
                                  guest.is_child ? "text-xs" : "text-sm"
                                )}>
                                  {getInitials(guest.name)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate flex items-center gap-1.5">
                                  {guest.name}
                                  {guest.is_child && (
                                    <Baby className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {guest.relationship || guest.group_name || 'No info'}
                                </div>
                              </div>
                              <TooltipProvider>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {guest.dietary_restrictions && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span><UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" /></span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Dietary restrictions</p></TooltipContent>
                                    </Tooltip>
                                  )}
                                  {guest.address && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span><MapPin className="h-3.5 w-3.5 text-blue-500" /></span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Address on file</p></TooltipContent>
                                    </Tooltip>
                                  )}
                                  {guest.partner_id && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span><Heart className="h-3.5 w-3.5 text-pink-500" /></span>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Partner linked</p></TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TooltipProvider>
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="focus:outline-none">
                                  <Badge
                                    variant={getRsvpBadgeVariant(guest.rsvp_status)}
                                    className="capitalize flex-shrink-0 cursor-pointer hover:opacity-80"
                                  >
                                    {guest.rsvp_status}
                                  </Badge>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {RSVP_OPTIONS.map((status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => handleQuickRsvp(guest, status)}
                                    className="capitalize"
                                  >
                                    {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                                    {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                                    {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                                    {status}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Singles section with header */}
                  {groupedByFamily.filter(g => g.members.length === 1).length > 0 && (
                    <div>
                      <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b">
                        <span className="font-semibold text-sm">Individual Guests</span>
                        <span className="text-muted-foreground text-sm ml-2">
                          ({groupedByFamily.filter(g => g.members.length === 1).length})
                        </span>
                      </div>
                      <div className="divide-y">
                        {groupedByFamily.filter(g => g.members.length === 1).map(({ members, key }) => {
                          const guest = members[0]
                          return (
                            <div
                              key={key}
                              className={cn(
                                "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors min-w-0",
                                selectedGuest?.id === guest.id && "bg-primary/5"
                              )}
                            >
                              <Checkbox
                                checked={selectedIds.has(guest.id)}
                                onCheckedChange={() => toggleSelection(guest.id)}
                                className="flex-shrink-0"
                              />
                              <button
                                onClick={() => handleSelectGuest(guest)}
                                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                              >
                                <div className={cn(
                                  "w-2 h-2 rounded-full flex-shrink-0",
                                  getPriorityColor(guest.priority)
                                )} />
                                <div className="flex-shrink-0 rounded-full bg-primary/10 flex items-center justify-center w-10 h-10">
                                  <span className="font-medium text-primary text-sm">
                                    {getInitials(guest.name)}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{guest.name}</div>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {guest.relationship || guest.group_name || 'No info'}
                                  </div>
                                </div>
                                <TooltipProvider>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {guest.dietary_restrictions && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span><UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" /></span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Dietary restrictions</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                    {guest.address && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span><MapPin className="h-3.5 w-3.5 text-blue-500" /></span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Address on file</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                    {guest.partner_id && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span><Heart className="h-3.5 w-3.5 text-pink-500" /></span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Partner linked</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                    {guest.plus_one && (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span><UserPlus className="h-3.5 w-3.5 text-purple-500" /></span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Has plus one</p></TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TooltipProvider>
                              </button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="focus:outline-none">
                                    <Badge
                                      variant={getRsvpBadgeVariant(guest.rsvp_status)}
                                      className="capitalize flex-shrink-0 cursor-pointer hover:opacity-80"
                                    >
                                      {guest.rsvp_status}
                                    </Badge>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {RSVP_OPTIONS.map((status) => (
                                    <DropdownMenuItem
                                      key={status}
                                      onClick={() => handleQuickRsvp(guest, status)}
                                      className="capitalize"
                                    >
                                      {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                                      {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                                      {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                                      {status}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Flat List View */
                <div className="divide-y">
                  {sortedGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className={cn(
                        "flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors min-w-0",
                        selectedGuest?.id === guest.id && "bg-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedIds.has(guest.id)}
                        onCheckedChange={() => toggleSelection(guest.id)}
                        className="flex-shrink-0"
                      />
                      {/* Clickable area for guest selection */}
                      <button
                        onClick={() => handleSelectGuest(guest)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        {/* Priority dot */}
                        <div className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0",
                          getPriorityColor(guest.priority)
                        )} title={guest.priority || 'No priority'} />

                        {/* Avatar */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {getInitials(guest.name)}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            {guest.name}
                            {guest.is_child && (
                              <Baby className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {guest.group_name || guest.relationship || 'No group'}
                          </div>
                        </div>

                        {/* Indicator icons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {guest.dietary_restrictions && (
                            <span title="Has dietary restrictions">
                              <UtensilsCrossed className="h-3.5 w-3.5 text-orange-500" />
                            </span>
                          )}
                          {guest.address && (
                            <span title="Address on file">
                              <MapPin className="h-3.5 w-3.5 text-blue-500" />
                            </span>
                          )}
                          {guest.partner_id && (
                            <span title="Has partner linked">
                              <Heart className="h-3.5 w-3.5 text-pink-500" />
                            </span>
                          )}
                          {guest.plus_one && (
                            <span title="Has plus one">
                              <UserPlus className="h-3.5 w-3.5 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Inline RSVP Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="focus:outline-none">
                            <Badge
                              variant={getRsvpBadgeVariant(guest.rsvp_status)}
                              className="capitalize flex-shrink-0 cursor-pointer hover:opacity-80"
                            >
                              {guest.rsvp_status}
                            </Badge>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {RSVP_OPTIONS.map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleQuickRsvp(guest, status)}
                              className="capitalize"
                            >
                              {status === 'confirmed' && <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />}
                              {status === 'pending' && <Clock className="h-4 w-4 mr-2 text-yellow-500" />}
                              {status === 'declined' && <XCircle className="h-4 w-4 mr-2 text-red-500" />}
                              {status}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                  {(isEditing || isCreating) ? (
                    <>
                      <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : (isCreating ? 'Add Guest' : 'Save')}
                      </Button>
                    </>
                  ) : selectedGuest && (
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

                  <div className="flex items-center gap-3 py-2">
                    <Switch
                      id="is-child"
                      checked={formData.is_child}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        is_child: checked,
                        parent_id: checked ? formData.parent_id : '',
                        partner_id: checked ? '' : formData.partner_id, // Clear partner if becoming child
                      })}
                    />
                    <Label htmlFor="is-child" className="cursor-pointer flex items-center gap-2">
                      <Baby className="h-4 w-4 text-muted-foreground" />
                      This guest is a child
                    </Label>
                  </div>

                  {formData.is_child ? (
                    <div className="space-y-2">
                      <Label htmlFor="parent">Parent</Label>
                      <Select
                        value={formData.parent_id}
                        onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {getParentOptions(formData.name, selectedGuest?.id).map((option) => (
                            <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="partner">Partner</Label>
                      {isAddingPartner ? (
                        <div className="flex gap-2">
                          <Input
                            value={newPartnerName}
                            onChange={(e) => setNewPartnerName(e.target.value)}
                            placeholder="Partner's full name"
                            autoFocus
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newPartnerName.trim()}
                            onClick={async () => {
                              if (!wedding?.id || !newPartnerName.trim()) return

                              // Check for duplicate name
                              const existingGuest = guests.find(
                                g => g.name.toLowerCase() === newPartnerName.trim().toLowerCase()
                              )
                              if (existingGuest) {
                                if (!confirm(`A guest named "${newPartnerName.trim()}" already exists. Create anyway?`)) {
                                  return
                                }
                              }

                              // Create new partner guest
                              const { data: newPartner, error } = await supabase
                                .from('guests')
                                .insert({
                                  id: crypto.randomUUID(),
                                  name: newPartnerName.trim(),
                                  wedding_id: wedding.id,
                                  group_name: formData.group_name || null,
                                  rsvp_status: 'pending',
                                  is_child: false,
                                })
                                .select()
                                .single()

                              if (error) {
                                toast.error('Failed to create partner')
                              } else {
                                setGuests(prev => [...prev, newPartner])
                                setFormData({ ...formData, partner_id: newPartner.id })
                                setNewPartnerName('')
                                setIsAddingPartner(false)
                                toast.success('Partner added')
                              }
                            }}
                          >
                            Create
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setIsAddingPartner(false)
                              setNewPartnerName('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Select
                          value={formData.partner_id}
                          onValueChange={(value) => {
                            if (value === '__add_new__') {
                              setIsAddingPartner(true)
                            } else {
                              setFormData({ ...formData, partner_id: value })
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select partner (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__add_new__" className="text-primary">
                              <span className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add new partner
                              </span>
                            </SelectItem>
                            {selectedGuest?.id && getPartnerOptions(selectedGuest.id, formData.name).map((adult) => (
                              <SelectItem key={adult.id} value={adult.id}>{adult.name}</SelectItem>
                            ))}
                            {!selectedGuest?.id && getPartnerOptions('', formData.name).map((adult) => (
                              <SelectItem key={adult.id} value={adult.id}>{adult.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="side">Side</Label>
                      <Select
                        value={formData.group_name || ''}
                        onValueChange={(value) => setFormData({ ...formData, group_name: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select side" />
                        </SelectTrigger>
                        <SelectContent>
                          {sideOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        {selectedGuest.name}
                        {selectedGuest.is_child && (
                          <Baby className="h-5 w-5 text-muted-foreground" />
                        )}
                      </h2>
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
                          <p className="text-sm text-muted-foreground">Side</p>
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

      </div>
    </div>
  )
}
