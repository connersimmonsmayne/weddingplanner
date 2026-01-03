'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  title: string
  due_date: string | null
  status: string
  priority?: string
}

interface WeeklyTasksProps {
  weddingId: string
}

export function WeeklyTasks({ weddingId }: WeeklyTasksProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchTasks()
  }, [weddingId])

  const fetchTasks = async () => {
    setLoading(true)

    // Get tasks due within the next 7 days (and overdue)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, due_date, status, priority')
      .eq('wedding_id', weddingId)
      .neq('status', 'completed')
      .lte('due_date', nextWeek.toISOString())
      .order('due_date', { ascending: true })

    if (error) {
      console.error('Error fetching tasks:', error)
    } else {
      setTasks(data || [])
    }
    setLoading(false)
  }

  const handleToggleTask = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', task.id)

    if (error) {
      toast.error('Failed to update task')
    } else {
      if (newStatus === 'completed') {
        setTasks(tasks.filter(t => t.id !== task.id))
        toast.success('Task completed!')
      } else {
        setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
      }
    }
  }

  // Group tasks by day
  const groupTasksByDay = () => {
    const groups: Record<string, Task[]> = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    tasks.forEach(task => {
      if (!task.due_date) {
        if (!groups['No Date']) groups['No Date'] = []
        groups['No Date'].push(task)
        return
      }

      const dueDate = new Date(task.due_date)
      dueDate.setHours(0, 0, 0, 0)

      const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      let label: string
      if (diffDays < 0) {
        label = 'Overdue'
      } else if (diffDays === 0) {
        label = 'Today'
      } else if (diffDays === 1) {
        label = 'Tomorrow'
      } else {
        label = dueDate.toLocaleDateString('en-US', { weekday: 'long' })
      }

      if (!groups[label]) groups[label] = []
      groups[label].push(task)
    })

    // Sort groups: Overdue first, then Today, Tomorrow, then by day
    const sortOrder = ['Overdue', 'Today', 'Tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'No Date']
    const sortedGroups: Record<string, Task[]> = {}
    sortOrder.forEach(day => {
      if (groups[day]) {
        sortedGroups[day] = groups[day]
      }
    })

    return sortedGroups
  }

  const groupedTasks = groupTasksByDay()

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">This Week</CardTitle>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No tasks due this week</p>
            <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedTasks).map(([day, dayTasks]) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <p className={cn(
                    "text-xs font-medium",
                    day === 'Overdue' ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {day}
                  </p>
                  {day === 'Overdue' && (
                    <AlertCircle className="h-3 w-3 text-destructive" />
                  )}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-2 sm:gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group",
                        day === 'Overdue' && "bg-destructive/5"
                      )}
                    >
                      <Checkbox
                        checked={task.status === 'completed'}
                        onCheckedChange={() => handleToggleTask(task)}
                        className="data-[state=checked]:bg-primary flex-shrink-0"
                      />
                      <span className={cn(
                        "text-sm flex-1 min-w-0 truncate",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      {task.due_date && day !== 'Overdue' && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:inline">
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
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
