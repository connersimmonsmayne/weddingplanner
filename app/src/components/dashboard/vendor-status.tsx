'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Store, CheckCircle2, Search, Phone, Mail, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Vendor {
  id: string
  name: string
  category: string
  status: string
  phone?: string | null
  email?: string | null
  quote?: number | null
}

interface VendorStatusProps {
  weddingId: string
}

export function VendorStatus({ weddingId }: VendorStatusProps) {
  const [bookedVendors, setBookedVendors] = useState<Vendor[]>([])
  const [researchingVendors, setResearchingVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, category, status, phone, email, quote')
        .eq('wedding_id', weddingId)
        .in('status', ['booked', 'researching', 'contacted'])
        .order('category')

      if (error) {
        console.error('Error fetching vendors:', error)
      } else {
        setBookedVendors(data?.filter(v => v.status === 'booked') || [])
        setResearchingVendors(data?.filter(v => v.status === 'researching' || v.status === 'contacted') || [])
      }
      setLoading(false)
    }

    fetchVendors()
  }, [weddingId])

  const getCategoryEmoji = (category: string): string => {
    const emojis: Record<string, string> = {
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
    }
    return emojis[category] || '📦'
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Vendors</CardTitle>
          </div>
          <Link href={`/vendors?wedding=${weddingId}`}>
            <Button variant="ghost" size="sm" className="text-xs">
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : bookedVendors.length === 0 && researchingVendors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Store className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No vendors yet</p>
            <Link href={`/vendors?wedding=${weddingId}`}>
              <Button variant="outline" size="sm" className="mt-3">
                Add Vendors
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Booked Vendors */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Booked</span>
                <Badge variant="success" className="text-xs">{bookedVendors.length}</Badge>
              </div>
              {bookedVendors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No vendors booked yet</p>
              ) : (
                <div className="space-y-2">
                  {bookedVendors.slice(0, 4).map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20"
                    >
                      <span className="text-lg">{getCategoryEmoji(vendor.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">{vendor.category}</p>
                      </div>
                      <div className="flex gap-1">
                        {vendor.phone && (
                          <a href={`tel:${vendor.phone}`} className="p-1 hover:bg-white/50 rounded">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                        {vendor.email && (
                          <a href={`mailto:${vendor.email}`} className="p-1 hover:bg-white/50 rounded">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  {bookedVendors.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{bookedVendors.length - 4} more
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Researching Vendors */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Researching</span>
                <Badge variant="warning" className="text-xs">{researchingVendors.length}</Badge>
              </div>
              {researchingVendors.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No vendors being researched</p>
              ) : (
                <div className="space-y-2">
                  {researchingVendors.slice(0, 4).map((vendor) => (
                    <div
                      key={vendor.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20"
                    >
                      <span className="text-lg">{getCategoryEmoji(vendor.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendor.category}
                          {vendor.quote && ` • $${vendor.quote.toLocaleString()}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {vendor.status}
                      </Badge>
                    </div>
                  ))}
                  {researchingVendors.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center py-1">
                      +{researchingVendors.length - 4} more
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
