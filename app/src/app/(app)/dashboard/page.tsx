'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  CalendarDays,
  TrendingUp
} from 'lucide-react'

interface DashboardStats {
  totalGuests: number
  confirmedGuests: number
  pendingGuests: number
  declinedGuests: number
  totalBudget: number
  spentBudget: number
  totalTasks: number
  completedTasks: number
  upcomingTasks: { id: string; title: string; due_date: string | null }[]
}

export default function DashboardPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const fetchStats = async () => {
      setLoading(true)

      // Fetch guests
      const { data: guests } = await supabase
        .from('guests')
        .select('rsvp_status')
        .eq('wedding_id', wedding.id)

      // Fetch budget categories
      const { data: budgetCategories } = await supabase
        .from('budget_categories')
        .select('allocated, spent')
        .eq('wedding_id', wedding.id)

      // Fetch tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, status, due_date')
        .eq('wedding_id', wedding.id)
        .order('due_date', { ascending: true })

      const guestStats = {
        totalGuests: guests?.length || 0,
        confirmedGuests: guests?.filter(g => g.rsvp_status === 'confirmed').length || 0,
        pendingGuests: guests?.filter(g => g.rsvp_status === 'pending').length || 0,
        declinedGuests: guests?.filter(g => g.rsvp_status === 'declined').length || 0,
      }

      const budgetStats = {
        totalBudget: budgetCategories?.reduce((sum, c) => sum + (c.allocated || 0), 0) || wedding.budget || 0,
        spentBudget: budgetCategories?.reduce((sum, c) => sum + (c.spent || 0), 0) || 0,
      }

      const taskStats = {
        totalTasks: tasks?.length || 0,
        completedTasks: tasks?.filter(t => t.status === 'completed').length || 0,
        upcomingTasks: tasks?.filter(t => t.status !== 'completed').slice(0, 5) || [],
      }

      setStats({
        ...guestStats,
        ...budgetStats,
        ...taskStats,
      })
      setLoading(false)
    }

    fetchStats()
  }, [wedding?.id])

  if (weddingLoading || loading) {
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

  const budgetPercentage = stats?.totalBudget 
    ? Math.round((stats.spentBudget / stats.totalBudget) * 100) 
    : 0

  const rsvpPercentage = stats?.totalGuests 
    ? Math.round(((stats.confirmedGuests + stats.declinedGuests) / stats.totalGuests) * 100)
    : 0

  const taskPercentage = stats?.totalTasks
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{wedding.name}</h1>
        <p className="text-muted-foreground">
          {wedding.partner1_name} & {wedding.partner2_name}
          {wedding.location && ` • ${wedding.location}`}
        </p>
      </div>

      {/* Countdown */}
      {daysUntilWedding !== null && (
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Days Until Wedding</p>
                <p className="text-4xl font-bold">
                  {daysUntilWedding > 0 ? daysUntilWedding : 'Today!'}
                </p>
              </div>
              <CalendarDays className="h-12 w-12 opacity-50" />
            </div>
            {wedding.wedding_date && (
              <p className="text-sm opacity-75 mt-2">
                {new Date(wedding.wedding_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Guest Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalGuests || 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default">{stats?.confirmedGuests || 0} confirmed</Badge>
              <Badge variant="secondary">{stats?.pendingGuests || 0} pending</Badge>
            </div>
            <Progress value={rsvpPercentage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">{rsvpPercentage}% responded</p>
          </CardContent>
        </Card>

        {/* Budget Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.spentBudget || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              of ${(stats?.totalBudget || 0).toLocaleString()} budget
            </p>
            <Progress 
              value={budgetPercentage} 
              className={`mt-3 ${budgetPercentage > 90 ? '[&>div]:bg-destructive' : ''}`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              ${((stats?.totalBudget || 0) - (stats?.spentBudget || 0)).toLocaleString()} remaining
            </p>
          </CardContent>
        </Card>

        {/* Tasks Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedTasks || 0} / {stats?.totalTasks || 0}
            </div>
            <p className="text-xs text-muted-foreground">tasks completed</p>
            <Progress value={taskPercentage} className="mt-3" />
            <p className="text-xs text-muted-foreground mt-1">{taskPercentage}% complete</p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overview</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cost per guest</span>
                <span className="font-medium">
                  ${stats?.confirmedGuests ? Math.round((stats.spentBudget || 0) / stats.confirmedGuests) : 0}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Budget per guest</span>
                <span className="font-medium">
                  ${stats?.totalGuests ? Math.round((stats.totalBudget || 0) / stats.totalGuests) : 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Tasks
          </CardTitle>
          <CardDescription>Your next action items</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.upcomingTasks && stats.upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <span>{task.title}</span>
                  {task.due_date && (
                    <Badge variant="outline">
                      {new Date(task.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              No upcoming tasks. Add some in the Timeline tab!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
