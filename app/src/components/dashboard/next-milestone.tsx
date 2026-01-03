'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchMilestoneData, Milestone } from '@/lib/milestones'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  MapPin,
  Mail,
  Store,
  Gift,
  Send,
  UserCheck,
  ClipboardCheck,
  Users,
  Heart,
  ChevronRight,
  Circle,
  PartyPopper,
} from 'lucide-react'

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  'venue': MapPin,
  'save-the-dates': Mail,
  'vendors': Store,
  'registry': Gift,
  'invitations': Send,
  'rsvps': UserCheck,
  'final-details': ClipboardCheck,
  'rehearsal': Users,
  'wedding-day': Heart,
}

interface NextMilestoneProps {
  weddingId: string
  weddingDate?: string | null
}

export function NextMilestone({ weddingId, weddingDate }: NextMilestoneProps) {
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const data = await fetchMilestoneData(supabase, weddingId, weddingDate)
      setNextMilestone(data.nextMilestone)
      setCompletedCount(data.completedCount)
      setTotalCount(data.totalCount)
      setLoading(false)
    }

    loadData()
  }, [weddingId, weddingDate])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse text-muted-foreground text-sm text-center">
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  // All milestones complete
  if (!nextMilestone) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <PartyPopper className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">All milestones complete!</p>
              <p className="font-medium">You're ready for your big day</p>
            </div>
            <Link href="/plan">
              <Button variant="outline" size="sm">
                View Plan
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  const Icon = MILESTONE_ICONS[nextMilestone.id] || Circle

  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary ring-offset-2">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">
              Next milestone ({completedCount}/{totalCount})
            </p>
            <p className="font-medium truncate">{nextMilestone.label}</p>
            <p className="text-sm text-muted-foreground truncate">
              {nextMilestone.detail}
            </p>
          </div>
          <Link href="/plan">
            <Button variant="outline" size="sm">
              View Plan
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
