'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Vendor } from '@/types/database'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Plus,
  Search,
  Store,
  Phone,
  Mail,
  Globe,
  Star,
  X,
  DollarSign,
  User,
  FileText,
  Trash2,
  ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

const VENDOR_CATEGORIES = [
  'Photography',
  'Videography',
  'Catering',
  'Florist',
  'Music/DJ',
  'Cake & Desserts',
  'Hair & Makeup',
  'Officiant',
  'Venue',
  'Transportation',
  'Other'
] as const

const STATUS_OPTIONS = ['researching', 'contacted', 'booked', 'rejected'] as const

interface VendorFormData {
  category: string
  name: string
  contact_name: string
  phone: string
  email: string
  website: string
  quote: string
  package_details: string
  status: 'researching' | 'contacted' | 'booked' | 'rejected'
  rating: number | null
  notes: string
}

const emptyFormData: VendorFormData = {
  category: 'Photography',
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  quote: '',
  package_details: '',
  status: 'researching',
  rating: null,
  notes: '',
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'booked': return 'success'
    case 'contacted': return 'warning'
    case 'rejected': return 'destructive'
    default: return 'secondary'
  }
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Photography': '📷',
    'Videography': '🎥',
    'Catering': '🍽️',
    'Florist': '💐',
    'Music/DJ': '🎵',
    'Cake & Desserts': '🎂',
    'Hair & Makeup': '💄',
    'Officiant': '💒',
    'Venue': '🏛️',
    'Transportation': '🚗',
    'Other': '📦'
  }
  return icons[category] || '📦'
}

export default function VendorsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<VendorFormData>(emptyFormData)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return
    fetchVendors()
  }, [wedding?.id])

  const fetchVendors = async () => {
    if (!wedding?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('wedding_id', wedding.id)
      .order('category')
      .order('name')

    if (error) {
      toast.error('Failed to load vendors')
      console.error(error)
    } else {
      setVendors(data || [])
    }
    setLoading(false)
  }

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === 'all' || vendor.category === filterCategory
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  const handleSelectVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setIsEditing(false)
    setIsCreating(false)
    setFormData({
      category: vendor.category,
      name: vendor.name,
      contact_name: vendor.contact_name || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      website: vendor.website || '',
      quote: vendor.quote?.toString() || '',
      package_details: vendor.package_details || '',
      status: vendor.status,
      rating: vendor.rating,
      notes: vendor.notes || '',
    })
  }

  const handleStartCreate = () => {
    setSelectedVendor(null)
    setIsEditing(false)
    setIsCreating(true)
    setFormData({
      ...emptyFormData,
      category: filterCategory !== 'all' ? filterCategory : 'Photography'
    })
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (isCreating) {
      setIsCreating(false)
      setSelectedVendor(null)
    } else if (selectedVendor) {
      setIsEditing(false)
      setFormData({
        category: selectedVendor.category,
        name: selectedVendor.name,
        contact_name: selectedVendor.contact_name || '',
        phone: selectedVendor.phone || '',
        email: selectedVendor.email || '',
        website: selectedVendor.website || '',
        quote: selectedVendor.quote?.toString() || '',
        package_details: selectedVendor.package_details || '',
        status: selectedVendor.status,
        rating: selectedVendor.rating,
        notes: selectedVendor.notes || '',
      })
    }
  }

  const handleClosePanel = () => {
    setSelectedVendor(null)
    setIsEditing(false)
    setIsCreating(false)
  }

  const handleSave = async () => {
    if (!wedding?.id || !formData.name.trim()) {
      toast.error('Vendor name is required')
      return
    }

    setSaving(true)

    const vendorData = {
      category: formData.category,
      name: formData.name,
      contact_name: formData.contact_name || null,
      phone: formData.phone || null,
      email: formData.email || null,
      website: formData.website || null,
      quote: formData.quote ? parseFloat(formData.quote) : null,
      package_details: formData.package_details || null,
      status: formData.status,
      rating: formData.rating,
      notes: formData.notes || null,
    }

    if (isCreating) {
      const { data, error } = await supabase
        .from('vendors')
        .insert({ ...vendorData, wedding_id: wedding.id })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add vendor')
        console.error(error)
      } else {
        setVendors([...vendors, data])
        toast.success('Vendor added')
        setIsCreating(false)
        setSelectedVendor(data)
      }
    } else if (selectedVendor) {
      const { error } = await supabase
        .from('vendors')
        .update({ ...vendorData, updated_at: new Date().toISOString() })
        .eq('id', selectedVendor.id)

      if (error) {
        toast.error('Failed to update vendor')
        console.error(error)
      } else {
        const updatedVendor = { ...selectedVendor, ...vendorData }
        setVendors(vendors.map(v => v.id === selectedVendor.id ? updatedVendor : v))
        setSelectedVendor(updatedVendor as Vendor)
        toast.success('Vendor updated')
        setIsEditing(false)
      }
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!selectedVendor) return
    if (!confirm(`Delete ${selectedVendor.name}?`)) return

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', selectedVendor.id)

    if (error) {
      toast.error('Failed to delete vendor')
      console.error(error)
    } else {
      setVendors(vendors.filter(v => v.id !== selectedVendor.id))
      setSelectedVendor(null)
      setIsEditing(false)
      toast.success('Vendor deleted')
    }
  }

  const handleQuickStatus = async (vendor: Vendor, status: typeof STATUS_OPTIONS[number]) => {
    const { error } = await supabase
      .from('vendors')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', vendor.id)

    if (error) {
      toast.error('Failed to update status')
    } else {
      const updatedVendor = { ...vendor, status }
      setVendors(vendors.map(v => v.id === vendor.id ? updatedVendor : v))
      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(updatedVendor)
        setFormData({ ...formData, status })
      }
      toast.success(`Status updated to ${status}`)
    }
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading vendors...</div>
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
    total: vendors.length,
    booked: vendors.filter(v => v.status === 'booked').length,
    researching: vendors.filter(v => v.status === 'researching').length,
  }

  const showDetailPanel = selectedVendor || isCreating

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      {/* Header */}
      <PageHeader
        title="Vendors"
        count={stats.total}
        countLabel={`vendors • ${stats.booked} booked • ${stats.researching} researching`}
      >
        <Button size="sm" onClick={handleStartCreate}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Add Vendor</span>
        </Button>
      </PageHeader>

      {/* Main Content - List + Detail Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Vendor List Panel */}
        <div className={cn(
          "flex flex-col min-h-0",
          showDetailPanel ? "hidden lg:flex lg:w-[360px]" : "flex-1"
        )}>
          {/* Search & Filters */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vendor List */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Store className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
                  </p>
                  {vendors.length === 0 && (
                    <Button variant="outline" className="mt-4" onClick={handleStartCreate}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first vendor
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      onClick={() => handleSelectVendor(vendor)}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                        selectedVendor?.id === vendor.id && "bg-primary/5"
                      )}
                    >
                      {/* Category Icon */}
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                        {getCategoryIcon(vendor.category)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{vendor.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {vendor.category}
                          {vendor.quote && ` • $${vendor.quote.toLocaleString()}`}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <Badge
                        variant={getStatusBadgeVariant(vendor.status)}
                        className="capitalize flex-shrink-0"
                      >
                        {vendor.status}
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
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Detail Header */}
            <CardHeader className="flex-shrink-0 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {isCreating ? 'New Vendor' : (isEditing ? 'Edit Vendor' : 'Vendor Details')}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {!isCreating && !isEditing && selectedVendor && (
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VENDOR_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value: typeof STATUS_OPTIONS[number]) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">Vendor Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Smith Photography"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Name</Label>
                      <Input
                        id="contact"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="vendor@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quote">Quote ($)</Label>
                      <Input
                        id="quote"
                        type="number"
                        value={formData.quote}
                        onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                        placeholder="2500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rating">Rating</Label>
                      <Select
                        value={formData.rating?.toString() || 'none'}
                        onValueChange={(value) => setFormData({ ...formData, rating: value === 'none' ? null : parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No rating</SelectItem>
                          {[1, 2, 3, 4, 5].map((r) => (
                            <SelectItem key={r} value={r.toString()}>{'★'.repeat(r)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="package">Package Details</Label>
                    <Textarea
                      id="package"
                      value={formData.package_details}
                      onChange={(e) => setFormData({ ...formData, package_details: e.target.value })}
                      placeholder="What's included in the quote?"
                      rows={3}
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
                      {saving ? 'Saving...' : (isCreating ? 'Add Vendor' : 'Save Changes')}
                    </Button>
                  </div>
                </div>
              ) : selectedVendor ? (
                /* View Mode */
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                      {getCategoryIcon(selectedVendor.category)}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedVendor.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{selectedVendor.category}</Badge>
                        <Badge
                          variant={getStatusBadgeVariant(selectedVendor.status)}
                          className="capitalize"
                        >
                          {selectedVendor.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Status Update */}
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-3">Quick Status Update</p>
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_OPTIONS.map((status) => (
                        <Button
                          key={status}
                          variant={selectedVendor.status === status ? 'default' : 'outline'}
                          size="sm"
                          className="capitalize"
                          onClick={() => handleQuickStatus(selectedVendor, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Quote & Rating */}
                  {(selectedVendor.quote || selectedVendor.rating) && (
                    <div className="flex items-center gap-6">
                      {selectedVendor.quote && (
                        <div>
                          <p className="text-sm text-muted-foreground">Quote</p>
                          <p className="text-2xl font-bold">${selectedVendor.quote.toLocaleString()}</p>
                        </div>
                      )}
                      {selectedVendor.rating && (
                        <div>
                          <p className="text-sm text-muted-foreground">Rating</p>
                          <div className="flex items-center gap-1 text-yellow-500">
                            {Array.from({ length: selectedVendor.rating }).map((_, i) => (
                              <Star key={i} className="h-5 w-5 fill-current" />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contact Details */}
                  <div className="space-y-4">
                    {selectedVendor.contact_name && (
                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Contact</p>
                          <p className="font-medium">{selectedVendor.contact_name}</p>
                        </div>
                      </div>
                    )}

                    {selectedVendor.phone && (
                      <div className="flex items-start gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <a
                            href={`tel:${selectedVendor.phone}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {selectedVendor.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedVendor.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <a
                            href={`mailto:${selectedVendor.email}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {selectedVendor.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedVendor.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Website</p>
                          <a
                            href={selectedVendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                          >
                            Visit Website
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedVendor.package_details && (
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Package Details</p>
                          <p className="font-medium whitespace-pre-line">{selectedVendor.package_details}</p>
                        </div>
                      </div>
                    )}

                    {selectedVendor.notes && (
                      <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="font-medium whitespace-pre-line">{selectedVendor.notes}</p>
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
                <Store className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Select a vendor from the list to view their details
                </p>
                <Button onClick={handleStartCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Vendor
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
