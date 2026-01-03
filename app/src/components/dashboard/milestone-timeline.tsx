'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Flag, Check, Circle, Clock } from 'lucide-react'

interface MilestoneData {
  venue: 'complete' | 'in_progress' | 'not_started'
  vendors: { booked: number; total: number; status: 'complete' | 'in_progress' | 'not_started' }
  invitations: { responded: number; total: number; status: 'complete' | 'in_progress' | 'not_started' }
  finalDetails: { completed: number; total: number; status: 'complete' | 'in_progress' | 'not_started' }
}

interface MilestoneTimelineProps {
  weddingId: string
  weddingDate?: string | null
}

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
]

export function MilestoneTimeline({ weddingId, weddingDate }: MilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<MilestoneData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchMilestoneData = async () => {
      setLoading(true)

      // Fetch venue status
      const { data: venueVendor } = await supabase
        .from('vendors')
        .select('status')
        .eq('wedding_id', weddingId)
        .eq('category', 'Venue')
        .eq('status', 'booked')
        .limit(1)

      // Fetch all vendors to calculate progress
      const { data: vendors } = await supabase
        .from('vendors')
        .select('category, status')
        .eq('wedding_id', weddingId)

      // Fetch guest RSVP stats
      const { data: guests } = await supabase
        .from('guests')
        .select('rsvp_status')
        .eq('wedding_id', weddingId)

      // Fetch tasks for final month (if wedding date is set)
      let finalMonthTasks = { completed: 0, total: 0 }
      if (weddingDate) {
        const wedding = new Date(weddingDate)
        const oneMonthBefore = new Date(wedding)
        oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1)

        const { data: tasks } = await supabase
          .from('tasks')
          .select('status, due_date')
          .eq('wedding_id', weddingId)
          .gte('due_date', oneMonthBefore.toISOString())
          .lte('due_date', wedding.toISOString())

        if (tasks) {
          finalMonthTasks = {
            total: tasks.length,
            completed: tasks.filter(t => t.status === 'completed').length,
          }
        }
      }

      // Calculate milestone statuses
      const venueStatus = venueVendor && venueVendor.length > 0 ? 'complete' : 'not_started'

      // Count booked vendors by category (excluding venue)
      const bookedCategories = new Set<string>()
      vendors?.forEach(v => {
        if (v.status === 'booked' && v.category !== 'Venue') {
          bookedCategories.add(v.category)
        }
      })
      const vendorCategoriesWithoutVenue = VENDOR_CATEGORIES.filter(c => c !== 'Venue')
      const vendorsBooked = bookedCategories.size
      const vendorsTotal = vendorCategoriesWithoutVenue.length
      const vendorStatus = vendorsBooked === vendorsTotal
        ? 'complete'
        : vendorsBooked > 0
          ? 'in_progress'
          : 'not_started'

      // Calculate invitation progress
      const totalGuests = guests?.length || 0
      const respondedGuests = guests?.filter(g => g.rsvp_status !== 'pending').length || 0
      const invitationStatus = totalGuests === 0
        ? 'not_started'
        : respondedGuests === totalGuests
          ? 'complete'
          : respondedGuests > 0
            ? 'in_progress'
            : 'not_started'

      // Final details status
      const finalStatus = finalMonthTasks.total === 0
        ? 'not_started'
        : finalMonthTasks.completed === finalMonthTasks.total
          ? 'complete'
          : finalMonthTasks.completed > 0
            ? 'in_progress'
            : 'not_started'

      setMilestones({
        venue: venueStatus,
        vendors: { booked: vendorsBooked, total: vendorsTotal, status: vendorStatus },
        invitations: { responded: respondedGuests, total: totalGuests, status: invitationStatus },
        finalDetails: { ...finalMonthTasks, status: finalStatus },
      })
      setLoading(false)
    }

    fetchMilestoneData()
  }, [weddingId, weddingDate])

  const getStatusIcon = (status: 'complete' | 'in_progress' | 'not_started') => {
    switch (status) {
      case 'complete':
        return <Check className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      default:
        return <Circle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: 'complete' | 'in_progress' | 'not_started') => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-500 text-white'
      case 'in_progress':
        return 'bg-amber-500 text-white'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const milestoneItems = milestones ? [
    {
      label: 'Venue',
      status: milestones.venue,
      detail: milestones.venue === 'complete' ? 'Booked' : 'Not booked',
    },
    {
      label: 'Vendors',
      status: milestones.vendors.status,
      detail: `${milestones.vendors.booked}/${milestones.vendors.total} booked`,
    },
    {
      label: 'Invitations',
      status: milestones.invitations.status,
      detail: milestones.invitations.total > 0
        ? `${Math.round((milestones.invitations.responded / milestones.invitations.total) * 100)}% responded`
        : 'No guests yet',
    },
    {
      label: 'Final Details',
      status: milestones.finalDetails.status,
      detail: milestones.finalDetails.total > 0
        ? `${milestones.finalDetails.completed}/${milestones.finalDetails.total} tasks`
        : 'No tasks yet',
    },
  ] : []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Planning Progress</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : (
          <div className="relative">
            {/* Progress line - hidden on mobile grid layout */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted hidden sm:block" />
            <div
              className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-500 hidden sm:block"
              style={{
                width: `${Math.max(0, (milestoneItems.filter(m => m.status === 'complete').length / milestoneItems.length) * 100 - 10)}%`
              }}
            />

            {/* Milestones - grid on mobile, flex row on larger screens */}
            <div className="relative grid grid-cols-2 gap-4 sm:flex sm:justify-between">
              {milestoneItems.map((item, index) => (
                <div key={item.label} className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      getStatusColor(item.status)
                    )}
                  >
                    {getStatusIcon(item.status)}
                  </div>
                  <span className="text-xs font-medium mt-2 text-center">{item.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{item.detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
