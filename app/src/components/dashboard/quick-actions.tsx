'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Receipt, ListPlus } from 'lucide-react'

interface QuickActionsProps {
  weddingId: string
  onActionComplete?: () => void
}

export function QuickActions({ weddingId, onActionComplete }: QuickActionsProps) {
  const [guestDialogOpen, setGuestDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  // Guest form state
  const [guestName, setGuestName] = useState('')
  const [guestRsvp, setGuestRsvp] = useState<'pending' | 'confirmed' | 'declined'>('pending')

  // Expense form state
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')

  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')

  const resetForms = () => {
    setGuestName('')
    setGuestRsvp('pending')
    setExpenseDescription('')
    setExpenseAmount('')
    setExpenseCategory('')
    setTaskTitle('')
    setTaskDueDate('')
  }

  const handleAddGuest = async () => {
    if (!guestName.trim()) {
      toast.error('Guest name is required')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('guests')
      .insert({
        wedding_id: weddingId,
        name: guestName.trim(),
        rsvp_status: guestRsvp,
      })

    if (error) {
      toast.error('Failed to add guest')
      console.error(error)
    } else {
      toast.success(`${guestName} added to guest list`)
      setGuestDialogOpen(false)
      resetForms()
      onActionComplete?.()
    }
    setSaving(false)
  }

  const handleAddExpense = async () => {
    if (!expenseDescription.trim() || !expenseAmount) {
      toast.error('Description and amount are required')
      return
    }

    setSaving(true)

    // First check if we need to create a budget category
    let categoryId = null
    if (expenseCategory) {
      const { data: existingCategory } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('wedding_id', weddingId)
        .eq('name', expenseCategory)
        .single()

      if (existingCategory) {
        categoryId = existingCategory.id
      } else {
        // Create the category
        const { data: newCategory } = await supabase
          .from('budget_categories')
          .insert({
            wedding_id: weddingId,
            name: expenseCategory,
            allocated: 0,
            spent: 0,
          })
          .select('id')
          .single()
        categoryId = newCategory?.id
      }
    }

    const { error } = await supabase
      .from('budget_expenses')
      .insert({
        wedding_id: weddingId,
        category_id: categoryId,
        description: expenseDescription.trim(),
        amount: parseFloat(expenseAmount),
      })

    // Update the category spent amount
    if (categoryId) {
      await supabase.rpc('update_category_spent', { cat_id: categoryId })
    }

    if (error) {
      toast.error('Failed to add expense')
      console.error(error)
    } else {
      toast.success(`$${parseFloat(expenseAmount).toLocaleString()} expense logged`)
      setExpenseDialogOpen(false)
      resetForms()
      onActionComplete?.()
    }
    setSaving(false)
  }

  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      toast.error('Task title is required')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('tasks')
      .insert({
        wedding_id: weddingId,
        title: taskTitle.trim(),
        due_date: taskDueDate || null,
        status: 'pending',
      })

    if (error) {
      toast.error('Failed to create task')
      console.error(error)
    } else {
      toast.success('Task created')
      setTaskDialogOpen(false)
      resetForms()
      onActionComplete?.()
    }
    setSaving(false)
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setGuestDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Guest
        </Button>
        <Button variant="outline" onClick={() => setExpenseDialogOpen(true)}>
          <Receipt className="h-4 w-4 mr-2" />
          Log Expense
        </Button>
        <Button variant="outline" onClick={() => setTaskDialogOpen(true)}>
          <ListPlus className="h-4 w-4 mr-2" />
          Create Task
        </Button>
      </div>

      {/* Add Guest Dialog */}
      <Dialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Guest</DialogTitle>
            <DialogDescription>Quickly add a guest to your list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guest-name">Name</Label>
              <Input
                id="guest-name"
                placeholder="Guest name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGuest()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-rsvp">RSVP Status</Label>
              <Select value={guestRsvp} onValueChange={(v: 'pending' | 'confirmed' | 'declined') => setGuestRsvp(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuestDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddGuest} disabled={saving}>
              {saving ? 'Adding...' : 'Add Guest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Expense</DialogTitle>
            <DialogDescription>Record a new expense</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-desc">Description</Label>
              <Input
                id="expense-desc"
                placeholder="What did you pay for?"
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount ($)</Label>
              <Input
                id="expense-amount"
                type="number"
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-category">Category (optional)</Label>
              <Input
                id="expense-category"
                placeholder="e.g., Photography, Catering"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={saving}>
              {saving ? 'Saving...' : 'Log Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
            <DialogDescription>Add a new task to your to-do list</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task</Label>
              <Input
                id="task-title"
                placeholder="What needs to be done?"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due">Due Date (optional)</Label>
              <Input
                id="task-due"
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={saving}>
              {saving ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
