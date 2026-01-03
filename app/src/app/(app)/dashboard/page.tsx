'use client'

import { useWedding } from '@/components/providers/wedding-provider'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { WeeklyTasks } from '@/components/dashboard/weekly-tasks'
import { MilestoneTimeline } from '@/components/dashboard/milestone-timeline'
import { VendorStatus } from '@/components/dashboard/vendor-status'
import { useState, useCallback } from 'react'

export default function DashboardPage() {
  const { wedding, membership, loading: weddingLoading } = useWedding()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleActionComplete = useCallback(() => {
    setRefreshKey(prev => prev + 1)
  }, [])

  // Get first name from membership display_name
  const userName = membership?.display_name?.split(' ')[0] || 'there'

  if (weddingLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
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

  const daysUntilWedding = wedding.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const formatCountdown = () => {
    if (daysUntilWedding === null) return null
    if (daysUntilWedding <= 0) return "It's your wedding day!"
    if (daysUntilWedding === 1) return '1 day to go'
    return `${daysUntilWedding} days to go`
  }

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}, {userName || 'there'}
        </h1>
        <p className="text-muted-foreground">
          {daysUntilWedding !== null && daysUntilWedding > 0 && (
            <>There {daysUntilWedding === 1 ? 'is' : 'are'} {daysUntilWedding} day{daysUntilWedding !== 1 ? 's' : ''} until the {wedding.name}</>
          )}
          {daysUntilWedding !== null && daysUntilWedding === 0 && "It's your wedding day!"}
          {daysUntilWedding === null && <>{wedding.partner1_name} & {wedding.partner2_name}</>}
        </p>
      </div>

      {/* Planning Milestone Timeline */}
      <MilestoneTimeline weddingId={wedding.id} weddingDate={wedding.wedding_date} />

      {/* Quick Actions */}
      <QuickActions weddingId={wedding.id} onActionComplete={handleActionComplete} />

      {/* Activity Feed + Weekly Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed
          key={`activity-${refreshKey}`}
          weddingId={wedding.id}
          userDisplayName={membership?.display_name || 'System'}
        />
        <WeeklyTasks key={`tasks-${refreshKey}`} weddingId={wedding.id} />
      </div>

      {/* Vendor Status Cards */}
      <VendorStatus weddingId={wedding.id} />
    </div>
  )
}
