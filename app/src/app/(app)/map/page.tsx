'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Guest } from '@/types/database'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { geocodeAddress } from '@/lib/geocode'
import dynamic from 'next/dynamic'

// Dynamically import Leaflet components (no SSR)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

interface GuestWithCoords extends Guest {
  latitude: number
  longitude: number
}

interface LocationGroup {
  lat: number
  lng: number
  guests: Guest[]
  label: string
}

// Group guests by approximate location (within ~10 miles)
function groupGuestsByLocation(guests: GuestWithCoords[]): LocationGroup[] {
  const groups: LocationGroup[] = []
  const THRESHOLD = 0.15 // ~10 miles in degrees

  for (const guest of guests) {
    let added = false
    for (const group of groups) {
      const latDiff = Math.abs(group.lat - guest.latitude)
      const lngDiff = Math.abs(group.lng - guest.longitude)
      if (latDiff < THRESHOLD && lngDiff < THRESHOLD) {
        group.guests.push(guest)
        // Update center to average
        group.lat = (group.lat * (group.guests.length - 1) + guest.latitude) / group.guests.length
        group.lng = (group.lng * (group.guests.length - 1) + guest.longitude) / group.guests.length
        added = true
        break
      }
    }
    if (!added) {
      // Extract city/state from address for label
      const addressParts = guest.address?.split(',') || []
      const label = addressParts.length >= 2
        ? `${addressParts[addressParts.length - 2]?.trim()}, ${addressParts[addressParts.length - 1]?.trim()?.split(' ')[0]}`
        : guest.address || 'Unknown'
      groups.push({
        lat: guest.latitude,
        lng: guest.longitude,
        guests: [guest],
        label,
      })
    }
  }

  return groups
}

export default function GuestMapPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeProgress, setGeocodeProgress] = useState({ current: 0, total: 0 })
  const [mapReady, setMapReady] = useState(false)
  const [customIcon, setCustomIcon] = useState<L.Icon | null>(null)

  const supabase = createClient()

  // Initialize Leaflet icon on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const icon = new L.Icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#d4a574" width="32" height="32">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `),
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        })
        setCustomIcon(icon)
        setMapReady(true)
      })
    }
  }, [])

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
      .not('address', 'is', null)
      .order('name')

    if (error) {
      toast.error('Failed to load guests')
      console.error(error)
    } else {
      setGuests(data || [])
    }

    setLoading(false)
  }

  // Guests with valid coordinates
  const guestsWithCoords = useMemo(() => {
    return guests.filter(
      (g): g is GuestWithCoords => g.latitude !== null && g.longitude !== null
    )
  }, [guests])

  // Guests that need geocoding
  const guestsNeedingGeocode = useMemo(() => {
    return guests.filter(
      (g) => g.address && g.latitude === null && g.longitude === null
    )
  }, [guests])

  // Group guests by location for clustering
  const locationGroups = useMemo(() => {
    return groupGuestsByLocation(guestsWithCoords)
  }, [guestsWithCoords])

  // Geocode addresses that don't have coordinates
  const handleGeocode = useCallback(async () => {
    if (guestsNeedingGeocode.length === 0) {
      toast.info('All addresses are already geocoded')
      return
    }

    setGeocoding(true)
    setGeocodeProgress({ current: 0, total: guestsNeedingGeocode.length })

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < guestsNeedingGeocode.length; i++) {
      const guest = guestsNeedingGeocode[i]
      setGeocodeProgress({ current: i + 1, total: guestsNeedingGeocode.length })

      try {
        const result = await geocodeAddress(guest.address!)
        if (result) {
          // Update database
          const { error } = await supabase
            .from('guests')
            .update({
              latitude: result.lat,
              longitude: result.lng,
              geocoded_at: new Date().toISOString(),
            })
            .eq('id', guest.id)

          if (!error) {
            // Update local state
            setGuests((prev) =>
              prev.map((g) =>
                g.id === guest.id
                  ? { ...g, latitude: result.lat, longitude: result.lng, geocoded_at: new Date().toISOString() }
                  : g
              )
            )
            successCount++
          } else {
            failCount++
          }
        } else {
          failCount++
        }
      } catch (error) {
        console.error('Error geocoding guest:', guest.name, error)
        failCount++
      }
    }

    setGeocoding(false)

    if (successCount > 0) {
      toast.success(`Geocoded ${successCount} address${successCount !== 1 ? 'es' : ''}`)
    }
    if (failCount > 0) {
      toast.error(`Failed to geocode ${failCount} address${failCount !== 1 ? 'es' : ''}`)
    }
  }, [guestsNeedingGeocode, supabase])

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading guest map...</div>
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

  const guestsWithAddresses = guests.length
  const guestsOnMap = guestsWithCoords.length

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col">
      <PageHeader
        title="Guest Map"
        count={guestsOnMap}
        countLabel={`of ${guestsWithAddresses} guests with addresses shown on map`}
      >
        {guestsNeedingGeocode.length > 0 && (
          <Button
            size="sm"
            onClick={handleGeocode}
            disabled={geocoding}
          >
            <RefreshCw className={`h-4 w-4 ${geocoding ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline ml-2">
              {geocoding
                ? `Geocoding ${geocodeProgress.current}/${geocodeProgress.total}...`
                : `Geocode ${guestsNeedingGeocode.length} Address${guestsNeedingGeocode.length !== 1 ? 'es' : ''}`}
            </span>
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 min-h-0">
        {guestsWithAddresses === 0 ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">No guest addresses yet</p>
              <p className="text-sm text-muted-foreground">
                Add addresses to your guests to see them on the map
              </p>
            </CardContent>
          </Card>
        ) : !mapReady ? (
          <Card className="h-full flex items-center justify-center">
            <CardContent className="text-center py-12">
              <div className="animate-pulse text-muted-foreground">Loading map...</div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full overflow-hidden">
            <MapContainer
              center={[39.8283, -98.5795]} // Center of US
              zoom={4}
              style={{ height: '100%', width: '100%' }}
              className="rounded-lg"
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {locationGroups.map((group, index) => (
                <Marker
                  key={index}
                  position={[group.lat, group.lng]}
                  icon={customIcon!}
                >
                  <Popup>
                    <div className="text-center min-w-[120px]">
                      <p className="font-semibold text-sm mb-1">{group.label}</p>
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="text-xs">
                          {group.guests.length} guest{group.guests.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {group.guests.length <= 5 && (
                        <div className="mt-2 text-xs text-left">
                          {group.guests.map((g) => (
                            <div key={g.id} className="truncate">{g.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </Card>
        )}
      </div>

      {/* Stats footer */}
      {guestsWithAddresses > 0 && (
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{locationGroups.length} locations</Badge>
          </div>
          {guestsNeedingGeocode.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {guestsNeedingGeocode.length} pending geocode
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
