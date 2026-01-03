'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchMilestoneData, Milestone, MilestoneData } from '@/lib/milestones'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  Check,
  Circle,
  MapPin,
  Mail,
  Users,
  Store,
  Gift,
  Send,
  UserCheck,
  ClipboardCheck,
  PartyPopper,
  Heart,
  ChevronRight,
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

export default function PlanPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [data, setData] = useState<MilestoneData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const loadData = async () => {
      setLoading(true)
      const milestoneData = await fetchMilestoneData(supabase, wedding.id, wedding.wedding_date)
      setData(milestoneData)
      setLoading(false)
    }

    loadData()
  }, [wedding?.id, wedding?.wedding_date])

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading milestones...</div>
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

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load milestones</p>
      </div>
    )
  }

  const { milestones, completedCount, totalCount } = data

  // Find the current (first incomplete) milestone index
  const currentIndex = milestones.findIndex(m => m.status !== 'complete')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan"
        count={completedCount}
        countLabel={`of ${totalCount} milestones complete`}
      />

      <Card>
        <CardContent className="py-8">
          <div className="relative max-w-2xl mx-auto">
            {/* Vertical timeline */}
            {milestones.map((milestone, index) => {
              const Icon = MILESTONE_ICONS[milestone.id] || Circle
              const isComplete = milestone.status === 'complete'
              const isCurrent = index === currentIndex
              const isUpcoming = !isComplete && !isCurrent

              return (
                <div key={milestone.id} className="relative">
                  {/* Connecting line */}
                  {index < milestones.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-5 top-12 w-0.5 h-16",
                        isComplete ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}

                  {/* Milestone row */}
                  <div
                    className={cn(
                      "relative flex items-start gap-4 pb-8",
                      isUpcoming && "opacity-50"
                    )}
                  >
                    {/* Status indicator */}
                    <div
                      className={cn(
                        "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isComplete && "bg-primary text-primary-foreground",
                        isCurrent && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2",
                        isUpcoming && "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={cn(
                            "font-medium",
                            isComplete && "text-muted-foreground",
                            isCurrent && "text-foreground"
                          )}
                        >
                          {milestone.label}
                        </h3>
                        {isCurrent && (
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {milestone.description}
                      </p>
                      <p
                        className={cn(
                          "text-sm mt-1",
                          isComplete ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {isComplete && "✓ "}
                        {milestone.detail}
                      </p>

                      {/* Action link for current milestone */}
                      {isCurrent && milestone.link && (
                        <Link href={milestone.link}>
                          <Button variant="outline" size="sm" className="mt-3">
                            {milestone.linkLabel || 'View'}
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Completion celebration */}
            {completedCount === totalCount && (
              <div className="text-center pt-4">
                <PartyPopper className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold">All milestones complete!</h3>
                <p className="text-muted-foreground">Congratulations on your journey</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
