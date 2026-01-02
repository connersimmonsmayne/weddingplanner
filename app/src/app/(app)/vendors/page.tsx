'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Vendor } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Plus, Pencil, Trash2, Store, Phone, Mail, Globe, Star } from 'lucide-react'

const VENDOR_CATEGORIES = [
  'Photography',
  'Videography',
  'Catering',
  'Florist',
  'Music/DJ',
  'Cake & Desserts',
  'Hair & Makeup',
  'Officiant',
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

export default function VendorsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [formData, setFormData] = useState<VendorFormData>(emptyFormData)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const fetchVendors = async () => {
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

    fetchVendors()
  }, [wedding?.id])

  const vendorsByCategory = VENDOR_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = vendors.filter(v => v.category === cat)
    return acc
  }, {} as Record<string, Vendor[]>)

  const filteredVendors = activeTab === 'all' 
    ? vendors 
    : vendors.filter(v => v.category === activeTab)

  const handleOpenDialog = (vendor?: Vendor, category?: string) => {
    if (vendor) {
      setEditingVendor(vendor)
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
    } else {
      setEditingVendor(null)
      setFormData({ ...emptyFormData, category: category || activeTab === 'all' ? 'Photography' : activeTab })
    }
    setDialogOpen(true)
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

    if (editingVendor) {
      const { error } = await supabase
        .from('vendors')
        .update({ ...vendorData, updated_at: new Date().toISOString() })
        .eq('id', editingVendor.id)

      if (error) {
        toast.error('Failed to update vendor')
      } else {
        setVendors(vendors.map(v => v.id === editingVendor.id ? { ...v, ...vendorData } : v))
        toast.success('Vendor updated')
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('vendors')
        .insert({ ...vendorData, wedding_id: wedding.id })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add vendor')
      } else {
        setVendors([...vendors, data])
        toast.success('Vendor added')
        setDialogOpen(false)
      }
    }

    setSaving(false)
  }

  const handleDelete = async (vendor: Vendor) => {
    if (!confirm(`Delete ${vendor.name}?`)) return

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendor.id)

    if (error) {
      toast.error('Failed to delete vendor')
    } else {
      setVendors(vendors.filter(v => v.id !== vendor.id))
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
      setVendors(vendors.map(v => v.id === vendor.id ? { ...v, status } : v))
      toast.success(`Status updated to ${status}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return 'default'
      case 'contacted': return 'secondary'
      case 'rejected': return 'destructive'
      default: return 'outline'
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

  const bookedCount = vendors.filter(v => v.status === 'booked').length
  const researchingCount = vendors.filter(v => v.status === 'researching').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-8 w-8" />
            Vendors
          </h1>
          <p className="text-muted-foreground">
            {vendors.length} vendors • {bookedCount} booked • {researchingCount} researching
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle>
              <DialogDescription>
                {editingVendor ? 'Update vendor information' : 'Add a new vendor to your list'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
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
                <div className="grid gap-2">
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
              <div className="grid gap-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Smith Photography"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="contact">Contact Name</Label>
                  <Input
                    id="contact"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="vendor@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quote">Quote ($)</Label>
                  <Input
                    id="quote"
                    type="number"
                    value={formData.quote}
                    onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                    placeholder="2500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Select
                    value={formData.rating?.toString() || ''}
                    onValueChange={(value) => setFormData({ ...formData, rating: value ? parseInt(value) : null })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Rate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No rating</SelectItem>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <SelectItem key={r} value={r.toString()}>{'★'.repeat(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="package">Package Details</Label>
                <Textarea
                  id="package"
                  value={formData.package_details}
                  onChange={(e) => setFormData({ ...formData, package_details: e.target.value })}
                  placeholder="What's included in the quote?"
                  rows={2}
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
                {saving ? 'Saving...' : (editingVendor ? 'Update' : 'Add Vendor')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all">All ({vendors.length})</TabsTrigger>
          {VENDOR_CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {cat} ({vendorsByCategory[cat]?.length || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredVendors.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all' 
                    ? 'No vendors yet. Start researching!' 
                    : `No ${activeTab} vendors yet.`}
                </p>
                <Button onClick={() => handleOpenDialog(undefined, activeTab === 'all' ? undefined : activeTab)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add {activeTab === 'all' ? 'Vendor' : activeTab}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVendors.map((vendor) => (
                <Card key={vendor.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{vendor.name}</CardTitle>
                        <CardDescription>{vendor.category}</CardDescription>
                      </div>
                      <Select
                        value={vendor.status}
                        onValueChange={(value: typeof STATUS_OPTIONS[number]) => 
                          handleQuickStatus(vendor, value)
                        }
                      >
                        <SelectTrigger className="w-auto h-7 text-xs">
                          <Badge variant={getStatusColor(vendor.status)} className="capitalize">
                            {vendor.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {vendor.contact_name && (
                        <p className="text-muted-foreground">{vendor.contact_name}</p>
                      )}
                      {vendor.phone && (
                        <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="h-3 w-3" />
                          {vendor.phone}
                        </a>
                      )}
                      {vendor.email && (
                        <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="h-3 w-3" />
                          {vendor.email}
                        </a>
                      )}
                      {vendor.website && (
                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                      {vendor.quote && (
                        <p className="font-semibold text-lg">${vendor.quote.toLocaleString()}</p>
                      )}
                      {vendor.rating && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          {Array.from({ length: vendor.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      )}
                      {vendor.package_details && (
                        <p className="text-muted-foreground text-xs">{vendor.package_details}</p>
                      )}
                      {vendor.notes && (
                        <p className="text-muted-foreground text-xs italic">{vendor.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleOpenDialog(vendor)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(vendor)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
