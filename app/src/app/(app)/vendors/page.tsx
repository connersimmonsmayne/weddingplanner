'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Vendor, VendorCategory } from '@/types/database'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
} from '@/components/ui/dialog'
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
  ExternalLink,
  Settings,
  MapPin,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = ['researching', 'contacted', 'booked', 'rejected'] as const

const SECTION_ORDER = ['ceremony', 'reception', 'beauty', 'media', 'logistics', 'other'] as const
const SECTION_LABELS: Record<string, string> = {
  ceremony: 'Ceremony',
  reception: 'Reception',
  beauty: 'Beauty',
  media: 'Media',
  logistics: 'Logistics',
  other: 'Other',
}

const DEFAULT_ICONS: Record<string, string> = {
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
  'Other': '📦',
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
] as const

interface VendorFormData {
  category: string
  name: string
  contact_name: string
  phone: string
  email: string
  website: string
  street_address: string
  city: string
  state: string
  zip_code: string
  visit_date: string
  quote: string
  package_details: string
  status: 'researching' | 'contacted' | 'booked' | 'rejected'
  rating: number | null
  notes: string
}

const emptyFormData: VendorFormData = {
  category: '',
  name: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
  street_address: '',
  city: '',
  state: '',
  zip_code: '',
  visit_date: '',
  quote: '',
  package_details: '',
  status: 'researching',
  rating: null,
  notes: '',
}

interface NewCategoryData {
  name: string
  section: typeof SECTION_ORDER[number]
  icon: string
}

const emptyNewCategory: NewCategoryData = {
  name: '',
  section: 'other',
  icon: '📦',
}

function getStatusBadgeVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'booked': return 'success'
    case 'contacted': return 'warning'
    case 'rejected': return 'destructive'
    default: return 'secondary'
  }
}

function getCategoryIcon(category: string, categories: VendorCategory[]): string {
  const cat = categories.find(c => c.name === category)
  if (cat?.icon) return cat.icon
  return DEFAULT_ICONS[category] || '📦'
}

export default function VendorsPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<VendorFormData>(emptyFormData)
  const [saving, setSaving] = useState(false)
  const [groupByCategory, setGroupByCategory] = useState(true)

  // Category management state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCategory, setNewCategory] = useState<NewCategoryData>(emptyNewCategory)
  const [savingCategory, setSavingCategory] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return
    fetchData()
  }, [wedding?.id])

  const fetchData = async () => {
    if (!wedding?.id) return
    setLoading(true)

    const [vendorsResult, categoriesResult] = await Promise.all([
      supabase
        .from('vendors')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('category')
        .order('name'),
      supabase
        .from('vendor_categories')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('section')
        .order('name'),
    ])

    if (vendorsResult.error) {
      toast.error('Failed to load vendors')
      console.error(vendorsResult.error)
    } else {
      setVendors(vendorsResult.data || [])
    }

    if (categoriesResult.error) {
      toast.error('Failed to load categories')
      console.error(categoriesResult.error)
    } else {
      setCategories(categoriesResult.data || [])
    }

    setLoading(false)
  }

  // Group categories by section
  const categoriesBySection = SECTION_ORDER.reduce((acc, section) => {
    acc[section] = categories.filter(c => c.section === section)
    return acc
  }, {} as Record<string, VendorCategory[]>)

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = filterCategory === 'all' || vendor.category === filterCategory
    const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Group vendors by category for grouped view
  const groupedVendors = useMemo(() => {
    const groups: { category: string; section: string; icon: string; vendors: Vendor[] }[] = []
    const categoryMap = new Map<string, Vendor[]>()

    filteredVendors.forEach(vendor => {
      if (!categoryMap.has(vendor.category)) {
        categoryMap.set(vendor.category, [])
      }
      categoryMap.get(vendor.category)!.push(vendor)
    })

    // Sort by section order, then by category name
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      const catA = categories.find(c => c.name === a)
      const catB = categories.find(c => c.name === b)
      const sectionA = catA?.section || 'other'
      const sectionB = catB?.section || 'other'
      const sectionOrderA = SECTION_ORDER.indexOf(sectionA as typeof SECTION_ORDER[number])
      const sectionOrderB = SECTION_ORDER.indexOf(sectionB as typeof SECTION_ORDER[number])

      if (sectionOrderA !== sectionOrderB) {
        return sectionOrderA - sectionOrderB
      }
      return a.localeCompare(b)
    })

    sortedCategories.forEach(categoryName => {
      const cat = categories.find(c => c.name === categoryName)
      groups.push({
        category: categoryName,
        section: cat?.section || 'other',
        icon: cat?.icon || DEFAULT_ICONS[categoryName] || '📦',
        vendors: categoryMap.get(categoryName)!,
      })
    })

    return groups
  }, [filteredVendors, categories])

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
      street_address: vendor.street_address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      zip_code: vendor.zip_code || '',
      visit_date: vendor.visit_date || '',
      quote: vendor.quote?.toString() || '',
      package_details: vendor.package_details || '',
      status: vendor.status,
      rating: vendor.rating,
      notes: vendor.notes || '',
    })
  }

  const handleStartCreate = (prefilledCategory?: string) => {
    setSelectedVendor(null)
    setIsEditing(false)
    setIsCreating(true)
    const defaultCategory = prefilledCategory || (filterCategory !== 'all' ? filterCategory : (categories[0]?.name || ''))
    setFormData({
      ...emptyFormData,
      category: defaultCategory,
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
        street_address: selectedVendor.street_address || '',
        city: selectedVendor.city || '',
        state: selectedVendor.state || '',
        zip_code: selectedVendor.zip_code || '',
        visit_date: selectedVendor.visit_date || '',
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

    if (!formData.category) {
      toast.error('Please select a category')
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
      street_address: formData.street_address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      visit_date: formData.visit_date || null,
      quote: formData.quote ? parseFloat(formData.quote) : null,
      package_details: formData.package_details || null,
      status: formData.status,
      rating: formData.rating,
      notes: formData.notes || null,
    }

    if (isCreating) {
      const { data, error } = await supabase
        .from('vendors')
        .insert({ ...vendorData, id: crypto.randomUUID(), wedding_id: wedding.id })
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

  // Category management functions
  const handleAddCategory = async () => {
    if (!wedding?.id || !newCategory.name.trim()) {
      toast.error('Category name is required')
      return
    }

    // Check if category already exists
    if (categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
      toast.error('A category with this name already exists')
      return
    }

    setSavingCategory(true)

    const { data, error } = await supabase
      .from('vendor_categories')
      .insert({
        wedding_id: wedding.id,
        name: newCategory.name,
        section: newCategory.section,
        icon: newCategory.icon,
        is_default: false,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add category')
      console.error(error)
    } else {
      setCategories([...categories, data])
      setNewCategory(emptyNewCategory)
      toast.success('Category added')
    }

    setSavingCategory(false)
  }

  const handleDeleteCategory = async (category: VendorCategory) => {
    if (category.is_default) {
      toast.error('Cannot delete default categories')
      return
    }

    // Check if any vendors use this category
    const vendorsWithCategory = vendors.filter(v => v.category === category.name)
    if (vendorsWithCategory.length > 0) {
      toast.error(`Cannot delete: ${vendorsWithCategory.length} vendor(s) use this category`)
      return
    }

    if (!confirm(`Delete category "${category.name}"?`)) return

    const { error } = await supabase
      .from('vendor_categories')
      .delete()
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to delete category')
      console.error(error)
    } else {
      setCategories(categories.filter(c => c.id !== category.id))
      toast.success('Category deleted')
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

  // Render grouped category select options
  const renderCategoryOptions = () => {
    return SECTION_ORDER.map(section => {
      const sectionCategories = categoriesBySection[section]
      if (sectionCategories.length === 0) return null

      return (
        <SelectGroup key={section}>
          <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            {SECTION_LABELS[section]}
          </SelectLabel>
          {sectionCategories.map(cat => (
            <SelectItem key={cat.id} value={cat.name}>
              <span className="mr-2">{cat.icon || '📦'}</span>
              {cat.name}
            </SelectItem>
          ))}
        </SelectGroup>
      )
    })
  }

  // Render vendor card - compact layout
  const renderVendorCard = (vendor: Vendor) => (
    <button
      key={vendor.id}
      onClick={() => handleSelectVendor(vendor)}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors",
        selectedVendor?.id === vendor.id && "bg-primary/5"
      )}
    >
      {/* Category Icon */}
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm">
        {getCategoryIcon(vendor.category, categories)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{vendor.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {!groupByCategory && vendor.category}
          {!groupByCategory && vendor.quote && ' • '}
          {vendor.quote && `$${vendor.quote.toLocaleString()}`}
          {vendor.visit_date && ` • ${new Date(vendor.visit_date).toLocaleDateString()}`}
        </div>
      </div>

      {/* Status Badge */}
      <Badge
        variant={getStatusBadgeVariant(vendor.status)}
        className="capitalize flex-shrink-0 text-xs"
      >
        {vendor.status}
      </Badge>
    </button>
  )

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      {/* Header */}
      <PageHeader
        title="Vendors"
        count={stats.total}
        countLabel={`vendors • ${stats.booked} booked • ${stats.researching} researching`}
      >
        <Button size="sm" onClick={() => handleStartCreate()}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Add Vendor</span>
        </Button>
      </PageHeader>

      {/* Main Content - List + Detail Layout */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden min-w-0">
        {/* Vendor List Panel */}
        <div className="flex flex-col min-h-0 overflow-hidden min-w-0 flex-1">
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
                  {renderCategoryOptions()}
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCategoryModal(true)}
                title="Manage Categories"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="group-by-category"
                  checked={groupByCategory}
                  onCheckedChange={setGroupByCategory}
                />
                <Label htmlFor="group-by-category" className="text-sm text-muted-foreground cursor-pointer">
                  Group by category
                </Label>
              </div>
              <div className="text-sm text-muted-foreground">
                Showing {filteredVendors.length} of {vendors.length} vendors
              </div>
            </div>
          </div>

          {/* Vendor List */}
          {filteredVendors.length === 0 ? (
            <Card className="flex-1 overflow-hidden">
              <CardContent className="p-0 h-full flex items-center justify-center">
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Store className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'}
                  </p>
                  {vendors.length === 0 && (
                    <Button variant="outline" className="mt-4" onClick={() => handleStartCreate()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first vendor
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : groupByCategory ? (
            /* Grid of Category Cards */
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedVendors.map(({ category, icon, vendors: categoryVendors }) => {
                  const bookedCount = categoryVendors.filter(v => v.status === 'booked').length
                  return (
                    <Card key={category}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{icon}</span>
                            <CardTitle className="text-base">{category}</CardTitle>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {categoryVendors.length} vendor{categoryVendors.length !== 1 ? 's' : ''} • {bookedCount} booked
                        </p>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {categoryVendors.length > 0 ? (
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {categoryVendors.map(vendor => (
                              <button
                                key={vendor.id}
                                onClick={() => handleSelectVendor(vendor)}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 p-2 rounded-md text-left hover:bg-muted/50 transition-colors",
                                  selectedVendor?.id === vendor.id && "bg-primary/5"
                                )}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{vendor.name}</div>
                                  {vendor.quote && (
                                    <div className="text-xs text-muted-foreground">${vendor.quote.toLocaleString()}</div>
                                  )}
                                </div>
                                <Badge
                                  variant={getStatusBadgeVariant(vendor.status)}
                                  className="capitalize text-xs flex-shrink-0"
                                >
                                  {vendor.status}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">No vendors yet</p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleStartCreate(category)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Vendor
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Flat List View */
            <Card className="flex-1 overflow-hidden">
              <CardContent className="p-0 h-full overflow-y-auto">
                <div className="divide-y">
                  {filteredVendors.map(vendor => renderVendorCard(vendor))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

      </div>

      {/* Category Management Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Add custom vendor categories or manage existing ones.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {/* Add New Category */}
            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium text-sm">Add New Category</h4>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Input
                  placeholder="Category name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                />
                <Input
                  placeholder="Icon"
                  value={newCategory.icon}
                  onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                  className="w-16 text-center"
                />
              </div>
              <div className="flex gap-3">
                <Select
                  value={newCategory.section}
                  onValueChange={(value: typeof SECTION_ORDER[number]) =>
                    setNewCategory({ ...newCategory, section: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTION_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>{SECTION_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddCategory} disabled={savingCategory}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>

            {/* Existing Categories by Section */}
            <div className="space-y-4">
              {SECTION_ORDER.map(section => {
                const sectionCategories = categoriesBySection[section]
                if (sectionCategories.length === 0) return null

                return (
                  <div key={section}>
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      {SECTION_LABELS[section]}
                    </h4>
                    <div className="space-y-1">
                      {sectionCategories.map(cat => {
                        const vendorCount = vendors.filter(v => v.category === cat.name).length
                        return (
                          <div
                            key={cat.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <span>{cat.icon || '📦'}</span>
                              <span>{cat.name}</span>
                              {cat.is_default && (
                                <Badge variant="secondary" className="text-xs">Default</Badge>
                              )}
                              {vendorCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({vendorCount} vendor{vendorCount !== 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                            {!cat.is_default && (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDeleteCategory(cat)}
                                disabled={vendorCount > 0}
                                title={vendorCount > 0 ? 'Cannot delete: vendors use this category' : 'Delete category'}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Vendor Modal */}
      <Dialog open={isCreating} onOpenChange={(open) => !open && setIsCreating(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to your wedding.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="create-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {renderCategoryOptions()}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: typeof STATUS_OPTIONS[number]) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger id="create-status">
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
              <Label htmlFor="create-name">Vendor Name *</Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Smith Photography"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-contact">Contact Name</Label>
                <Input
                  id="create-contact"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone</Label>
                <Input
                  id="create-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="vendor@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-website">Website</Label>
              <Input
                id="create-website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-street_address">Street Address</Label>
              <Input
                id="create-street_address"
                value={formData.street_address}
                onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-city">City</Label>
                <Input
                  id="create-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="create-state">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger id="create-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-zip_code">Zip</Label>
                  <Input
                    id="create-zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="12345"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-visit_date">Visit Date</Label>
                <Input
                  id="create-visit_date"
                  type="date"
                  value={formData.visit_date}
                  onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-quote">Quote ($)</Label>
                <Input
                  id="create-quote"
                  type="number"
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder="2500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-rating">Rating</Label>
              <Select
                value={formData.rating?.toString() || 'none'}
                onValueChange={(value) => setFormData({ ...formData, rating: value === 'none' ? null : parseInt(value) })}
              >
                <SelectTrigger id="create-rating">
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

            <div className="space-y-2">
              <Label htmlFor="create-package">Package Details</Label>
              <Textarea
                id="create-package"
                value={formData.package_details}
                onChange={(e) => setFormData({ ...formData, package_details: e.target.value })}
                placeholder="What's included in the quote?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Adding...' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Details Modal */}
      <Dialog open={selectedVendor !== null} onOpenChange={(open) => !open && handleClosePanel()}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>{isEditing ? 'Edit Vendor' : 'Vendor Details'}</DialogTitle>
              {!isEditing && selectedVendor && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleStartEdit}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {isEditing ? (
              /* Edit Form */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger id="edit-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {renderCategoryOptions()}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: typeof STATUS_OPTIONS[number]) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger id="edit-status">
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
                  <Label htmlFor="edit-name">Vendor Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Smith Photography"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contact">Contact Name</Label>
                    <Input
                      id="edit-contact"
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-website">Website</Label>
                  <Input
                    id="edit-website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-street_address">Street Address</Label>
                  <Input
                    id="edit-street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData({ ...formData, street_address: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-city">City</Label>
                    <Input
                      id="edit-city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-state">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger id="edit-state">
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-zip_code">Zip</Label>
                      <Input
                        id="edit-zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="12345"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-visit_date">Visit Date</Label>
                    <Input
                      id="edit-visit_date"
                      type="date"
                      value={formData.visit_date}
                      onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-quote">Quote ($)</Label>
                    <Input
                      id="edit-quote"
                      type="number"
                      value={formData.quote}
                      onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                      placeholder="2500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-rating">Rating</Label>
                  <Select
                    value={formData.rating?.toString() || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, rating: value === 'none' ? null : parseInt(value) })}
                  >
                    <SelectTrigger id="edit-rating">
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

                <div className="space-y-2">
                  <Label htmlFor="edit-package">Package Details</Label>
                  <Textarea
                    id="edit-package"
                    value={formData.package_details}
                    onChange={(e) => setFormData({ ...formData, package_details: e.target.value })}
                    placeholder="What's included in the quote?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes"
                    rows={2}
                  />
                </div>
              </div>
            ) : selectedVendor ? (
              /* View Mode */
              <div className="space-y-5">
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    {getCategoryIcon(selectedVendor.category, categories)}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{selectedVendor.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{selectedVendor.category}</Badge>
                      <Badge
                        variant={getStatusBadgeVariant(selectedVendor.status)}
                        className="capitalize text-xs"
                      >
                        {selectedVendor.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Status Update */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Quick Status Update</p>
                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map((status) => (
                      <Button
                        key={status}
                        variant={selectedVendor.status === status ? 'default' : 'outline'}
                        size="sm"
                        className="capitalize text-xs h-7"
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
                        <p className="text-xs text-muted-foreground">Quote</p>
                        <p className="text-xl font-bold">${selectedVendor.quote.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedVendor.rating && (
                      <div>
                        <p className="text-xs text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-0.5 text-yellow-500">
                          {Array.from({ length: selectedVendor.rating }).map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-current" />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Visit Date */}
                {selectedVendor.visit_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Visit Date</p>
                      <p className="text-sm font-medium">
                        {new Date(selectedVendor.visit_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact Details */}
                <div className="space-y-3">
                  {selectedVendor.contact_name && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Contact</p>
                        <p className="text-sm font-medium">{selectedVendor.contact_name}</p>
                      </div>
                    </div>
                  )}

                  {selectedVendor.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <a
                          href={`tel:${selectedVendor.phone}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {selectedVendor.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedVendor.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <a
                          href={`mailto:${selectedVendor.email}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          {selectedVendor.email}
                        </a>
                      </div>
                    </div>
                  )}

                  {selectedVendor.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Website</p>
                        <a
                          href={selectedVendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Visit Website
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}

                  {(selectedVendor.street_address || selectedVendor.city || selectedVendor.state) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">
                          {selectedVendor.street_address && <span>{selectedVendor.street_address}<br /></span>}
                          {selectedVendor.city}{selectedVendor.city && selectedVendor.state && ', '}{selectedVendor.state} {selectedVendor.zip_code}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedVendor.package_details && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Package Details</p>
                        <p className="text-sm font-medium whitespace-pre-line">{selectedVendor.package_details}</p>
                      </div>
                    </div>
                  )}

                  {selectedVendor.notes && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm font-medium whitespace-pre-line">{selectedVendor.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {isEditing && (
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
