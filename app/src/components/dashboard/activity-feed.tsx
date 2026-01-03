'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Activity,
  UserCheck,
  UserX,
  UserMinus,
  Receipt,
  CheckCircle2,
  Store,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ActivityItem {
  id: string
  type: 'rsvp_confirmed' | 'rsvp_declined' | 'rsvp_pending' | 'expense' | 'task_completed' | 'vendor_booked'
  title: string
  description?: string
  timestamp: string
  performedBy: string
  metadata?: Record<string, unknown>
}

interface ActivityFeedProps {
  weddingId: string
  userDisplayName?: string
}

export function ActivityFeed({ weddingId, userDisplayName = 'System' }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true)

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const cutoffDate = sevenDaysAgo.toISOString()

      // Fetch recent guest RSVP changes
      const { data: guests } = await supabase
        .from('guests')
        .select('id, name, rsvp_status, updated_at')
        .eq('wedding_id', weddingId)
        .gte('updated_at', cutoffDate)
        .order('updated_at', { ascending: false })
        .limit(10)

      // Fetch recent expenses
      const { data: expenses } = await supabase
        .from('budget_expenses')
        .select('id, description, amount, created_at')
        .eq('wedding_id', weddingId)
        .gte('created_at', cutoffDate)
        .order('created_at', { ascending: false })
        .limit(10)

      // Fetch recently completed tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, updated_at')
        .eq('wedding_id', weddingId)
        .eq('status', 'completed')
        .gte('updated_at', cutoffDate)
        .order('updated_at', { ascending: false })
        .limit(10)

      // Fetch recently booked vendors
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, name, category, updated_at')
        .eq('wedding_id', weddingId)
        .eq('status', 'booked')
        .gte('updated_at', cutoffDate)
        .order('updated_at', { ascending: false })
        .limit(10)

      // Combine and format activities
      const allActivities: ActivityItem[] = []

      guests?.forEach(guest => {
        const type = guest.rsvp_status === 'confirmed'
          ? 'rsvp_confirmed'
          : guest.rsvp_status === 'declined'
            ? 'rsvp_declined'
            : 'rsvp_pending'

        allActivities.push({
          id: `guest-${guest.id}`,
          type,
          title: guest.name,
          description: guest.rsvp_status === 'confirmed'
            ? 'confirmed their RSVP'
            : guest.rsvp_status === 'declined'
              ? 'declined the invitation'
              : 'RSVP pending',
          timestamp: guest.updated_at,
          performedBy: guest.rsvp_status === 'pending' ? userDisplayName : guest.name,
        })
      })

      expenses?.forEach(expense => {
        allActivities.push({
          id: `expense-${expense.id}`,
          type: 'expense',
          title: expense.description || 'Expense logged',
          description: `$${expense.amount?.toLocaleString()}`,
          timestamp: expense.created_at,
          performedBy: userDisplayName,
        })
      })

      tasks?.forEach(task => {
        allActivities.push({
          id: `task-${task.id}`,
          type: 'task_completed',
          title: task.title,
          description: 'completed',
          timestamp: task.updated_at,
          performedBy: userDisplayName,
        })
      })

      vendors?.forEach(vendor => {
        allActivities.push({
          id: `vendor-${vendor.id}`,
          type: 'vendor_booked',
          title: vendor.name,
          description: `booked as ${vendor.category}`,
          timestamp: vendor.updated_at,
          performedBy: userDisplayName,
        })
      })

      // Sort by timestamp descending
      allActivities.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivities(allActivities.slice(0, 10))
      setLoading(false)
    }

    fetchActivities()
  }, [weddingId])

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'rsvp_confirmed':
        return <UserCheck className="h-4 w-4 text-emerald-500" />
      case 'rsvp_declined':
        return <UserX className="h-4 w-4 text-red-500" />
      case 'rsvp_pending':
        return <UserMinus className="h-4 w-4 text-amber-500" />
      case 'expense':
        return <Receipt className="h-4 w-4 text-blue-500" />
      case 'task_completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case 'vendor_booked':
        return <Store className="h-4 w-4 text-purple-500" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return ''
    }
  }

  // Group activities by day
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = new Date(activity.timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let label: string
    if (date.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">Activity from the last 7 days will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedActivities).map(([day, items]) => (
              <div key={day}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{day}</p>
                <div className="space-y-2">
                  {items.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="mt-0.5 flex-shrink-0">{getActivityIcon(activity.type)}</div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-baseline justify-between gap-2 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                          <span className="mx-1">·</span>
                          <span className="italic">by {activity.performedBy}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
