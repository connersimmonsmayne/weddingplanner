'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { TimelineEvent, Task } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Calendar, Clock, CheckCircle2, Circle } from 'lucide-react'

const OWNERS = ['Conner', 'Greta', 'Both'] as const
const PRIORITIES = ['high', 'medium', 'low'] as const

type TaskFormState = {
  title: string
  description: string
  category: string
  owner: 'Conner' | 'Greta' | 'Both'
  due_date: string
  priority: 'high' | 'medium' | 'low'
}

type EventFormState = {
  timeline_type: 'master' | 'day-of'
  title: string
  description: string
  event_time: string
  location: string
  who: string
}

export default function TimelinePage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [tasks, setTasks] = useState<Task[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tasks')
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    title: '', description: '', category: '', owner: 'Both', 
    due_date: '', priority: 'medium'
  })
  const [eventForm, setEventForm] = useState<EventFormState>({
    timeline_type: 'day-of', title: '', description: '', 
    event_time: '', location: '', who: ''
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const fetchData = async () => {
      setLoading(true)
      
      const [{ data: tasksData }, { data: eventsData }] = await Promise.all([
        supabase.from('tasks').select('*').eq('wedding_id', wedding.id).order('due_date', { nullsFirst: false }),
        supabase.from('timeline_events').select('*').eq('wedding_id', wedding.id).order('sort_order')
      ])

      setTasks(tasksData || [])
      setTimelineEvents(eventsData || [])
      setLoading(false)
    }

    fetchData()
  }, [wedding?.id])

  // Task handlers
  const handleOpenTaskDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task)
      setTaskForm({
        title: task.title,
        description: task.description || '',
        category: task.category || '',
        owner: task.owner,
        due_date: task.due_date || '',
        priority: task.priority,
      })
    } else {
      setEditingTask(null)
      setTaskForm({ title: '', description: '', category: '', owner: 'Both', due_date: '', priority: 'medium' })
    }
    setTaskDialogOpen(true)
  }

  const handleSaveTask = async () => {
    if (!wedding?.id || !taskForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const taskData = {
      title: taskForm.title,
      description: taskForm.description || null,
      category: taskForm.category || null,
      owner: taskForm.owner,
      due_date: taskForm.due_date || null,
      priority: taskForm.priority,
    }

    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update({ ...taskData, updated_at: new Date().toISOString() })
        .eq('id', editingTask.id)

      if (error) {
        toast.error('Failed to update task')
      } else {
        setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t))
        toast.success('Task updated')
        setTaskDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...taskData, wedding_id: wedding.id, status: 'pending' })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add task')
      } else {
        setTasks([...tasks, data])
        toast.success('Task added')
        setTaskDialogOpen(false)
      }
    }

    setSaving(false)
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
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    }
  }

  const handleDeleteTask = async (task: Task) => {
    if (!confirm(`Delete "${task.title}"?`)) return

    const { error } = await supabase.from('tasks').delete().eq('id', task.id)

    if (error) {
      toast.error('Failed to delete task')
    } else {
      setTasks(tasks.filter(t => t.id !== task.id))
      toast.success('Task deleted')
    }
  }

  // Timeline event handlers
  const handleOpenEventDialog = (event?: TimelineEvent) => {
    if (event) {
      setEditingEvent(event)
      setEventForm({
        timeline_type: event.timeline_type,
        title: event.title,
        description: event.description || '',
        event_time: event.event_time || '',
        location: event.location || '',
        who: event.who || '',
      })
    } else {
      setEditingEvent(null)
      setEventForm({ timeline_type: 'day-of', title: '', description: '', event_time: '', location: '', who: '' })
    }
    setTimelineDialogOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!wedding?.id || !eventForm.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const eventData = {
      timeline_type: eventForm.timeline_type,
      title: eventForm.title,
      description: eventForm.description || null,
      event_time: eventForm.event_time || null,
      location: eventForm.location || null,
      who: eventForm.who || null,
    }

    if (editingEvent) {
      const { error } = await supabase
        .from('timeline_events')
        .update({ ...eventData, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id)

      if (error) {
        toast.error('Failed to update event')
      } else {
        setTimelineEvents(timelineEvents.map(e => e.id === editingEvent.id ? { ...e, ...eventData } : e))
        toast.success('Event updated')
        setTimelineDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('timeline_events')
        .insert({ ...eventData, wedding_id: wedding.id, sort_order: timelineEvents.length })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add event')
      } else {
        setTimelineEvents([...timelineEvents, data])
        toast.success('Event added')
        setTimelineDialogOpen(false)
      }
    }

    setSaving(false)
  }

  const handleDeleteEvent = async (event: TimelineEvent) => {
    if (!confirm(`Delete "${event.title}"?`)) return

    const { error } = await supabase.from('timeline_events').delete().eq('id', event.id)

    if (error) {
      toast.error('Failed to delete event')
    } else {
      setTimelineEvents(timelineEvents.filter(e => e.id !== event.id))
      toast.success('Event deleted')
    }
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading timeline...</div>
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

  const pendingTasks = tasks.filter(t => t.status !== 'completed')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const dayOfEvents = timelineEvents.filter(e => e.timeline_type === 'day-of')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Timeline & Tasks
          </h1>
          <p className="text-muted-foreground">
            {pendingTasks.length} pending tasks • {dayOfEvents.length} day-of events
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="day-of">Day-of Timeline ({dayOfEvents.length})</TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenTaskDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input
                      value={taskForm.title}
                      onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                      placeholder="Task title"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Owner</Label>
                      <Select value={taskForm.owner} onValueChange={(v: typeof OWNERS[number]) => setTaskForm({ ...taskForm, owner: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {OWNERS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Priority</Label>
                      <Select value={taskForm.priority} onValueChange={(v: typeof PRIORITIES[number]) => setTaskForm({ ...taskForm, priority: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Category</Label>
                      <Input
                        value={taskForm.category}
                        onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                        placeholder="e.g., Venue, Catering"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      placeholder="Additional details"
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveTask} disabled={saving}>
                    {saving ? 'Saving...' : (editingTask ? 'Update' : 'Add Task')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pending Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Pending ({pendingTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No pending tasks!</p>
              ) : (
                <div className="space-y-2">
                  {pendingTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                      <Checkbox checked={false} onCheckedChange={() => handleToggleTask(task)} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {task.owner && <span>{task.owner}</span>}
                          {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'low' ? 'secondary' : 'default'}>
                        {task.priority}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenTaskDialog(task)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Completed ({completedTasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                      <Checkbox checked={true} onCheckedChange={() => handleToggleTask(task)} />
                      <p className="flex-1 line-through text-muted-foreground">{task.title}</p>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Day-of Timeline Tab */}
        <TabsContent value="day-of" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenEventDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingEvent ? 'Edit Event' : 'Add Event'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Title *</Label>
                    <Input
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      placeholder="e.g., Ceremony begins"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={eventForm.event_time}
                        onChange={(e) => setEventForm({ ...eventForm, event_time: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Location</Label>
                      <Input
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        placeholder="Where?"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Who</Label>
                    <Input
                      value={eventForm.who}
                      onChange={(e) => setEventForm({ ...eventForm, who: e.target.value })}
                      placeholder="Who's involved?"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTimelineDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveEvent} disabled={saving}>
                    {saving ? 'Saving...' : (editingEvent ? 'Update' : 'Add Event')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {dayOfEvents.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground mb-4">No day-of events yet.</p>
                <Button onClick={() => handleOpenEventDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {dayOfEvents.map((event) => (
                  <div key={event.id} className="relative pl-10">
                    <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full bg-primary" />
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              {event.event_time && (
                                <Badge variant="outline" className="font-mono">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {event.event_time}
                                </Badge>
                              )}
                              <h3 className="font-semibold">{event.title}</h3>
                            </div>
                            {event.location && <p className="text-sm text-muted-foreground mt-1">{event.location}</p>}
                            {event.who && <p className="text-sm text-muted-foreground">{event.who}</p>}
                            {event.description && <p className="text-sm mt-2">{event.description}</p>}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEventDialog(event)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
