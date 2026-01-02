'use client'

import { useEffect, useState } from 'react'
import { useWedding } from '@/components/providers/wedding-provider'
import { createClient } from '@/lib/supabase/client'
import { BudgetCategory, BudgetExpense } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Wallet, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react'

interface CategoryWithExpenses extends BudgetCategory {
  expenses?: BudgetExpense[]
}

const DEFAULT_CATEGORIES = [
  'Venue',
  'Catering',
  'Photography',
  'Videography',
  'Florist',
  'Music/DJ',
  'Cake & Desserts',
  'Attire',
  'Hair & Makeup',
  'Decor',
  'Stationery',
  'Transportation',
  'Officiant',
  'Gifts & Favors',
  'Honeymoon',
  'Miscellaneous',
]

export default function BudgetPage() {
  const { wedding, loading: weddingLoading } = useWedding()
  const [categories, setCategories] = useState<CategoryWithExpenses[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<BudgetCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState({ category: '', allocated: '' })
  const [expenseForm, setExpenseForm] = useState({ 
    description: '', 
    amount: '', 
    vendor: '', 
    paid: false,
    due_date: ''
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!wedding?.id) return

    const fetchBudget = async () => {
      setLoading(true)
      
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('category')

      if (catError) {
        toast.error('Failed to load budget')
        console.error(catError)
        setLoading(false)
        return
      }

      const cats = categoriesData as BudgetCategory[] || []
      
      // Fetch expenses for each category
      const categoryIds = cats.map(c => c.id)
      let expensesData: BudgetExpense[] = []
      
      if (categoryIds.length > 0) {
        const { data } = await supabase
          .from('budget_expenses')
          .select('*')
          .in('category_id', categoryIds)
          .order('created_at', { ascending: false })
        expensesData = (data as BudgetExpense[]) || []
      }

      // Combine categories with their expenses
      const categoriesWithExpenses = cats.map(cat => ({
        ...cat,
        expenses: expensesData.filter(e => e.category_id === cat.id)
      }))

      setCategories(categoriesWithExpenses)
      setLoading(false)
    }

    fetchBudget()
  }, [wedding?.id])

  const totalAllocated = categories.reduce((sum, c) => sum + (c.allocated || 0), 0)
  const totalSpent = categories.reduce((sum, c) => sum + (c.spent || 0), 0)
  const remaining = totalAllocated - totalSpent
  const percentSpent = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0

  const handleOpenCategoryDialog = (category?: BudgetCategory) => {
    if (category) {
      setEditingCategory(category)
      setCategoryForm({ category: category.category, allocated: category.allocated.toString() })
    } else {
      setEditingCategory(null)
      setCategoryForm({ category: '', allocated: '' })
    }
    setCategoryDialogOpen(true)
  }

  const handleSaveCategory = async () => {
    if (!wedding?.id || !categoryForm.category.trim()) {
      toast.error('Category name is required')
      return
    }

    setSaving(true)
    const allocated = parseFloat(categoryForm.allocated) || 0

    if (editingCategory) {
      const { error } = await supabase
        .from('budget_categories')
        .update({ 
          category: categoryForm.category, 
          allocated,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCategory.id)

      if (error) {
        toast.error('Failed to update category')
      } else {
        setCategories(categories.map(c => 
          c.id === editingCategory.id 
            ? { ...c, category: categoryForm.category, allocated } 
            : c
        ))
        toast.success('Category updated')
        setCategoryDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({ 
          wedding_id: wedding.id, 
          category: categoryForm.category, 
          allocated,
          spent: 0
        })
        .select()
        .single()

      if (error) {
        toast.error('Failed to add category')
      } else {
        setCategories([...categories, { ...data, expenses: [] }])
        toast.success('Category added')
        setCategoryDialogOpen(false)
      }
    }

    setSaving(false)
  }

  const handleDeleteCategory = async (category: BudgetCategory) => {
    if (!confirm(`Delete "${category.category}" and all its expenses?`)) return

    const { error } = await supabase
      .from('budget_categories')
      .delete()
      .eq('id', category.id)

    if (error) {
      toast.error('Failed to delete category')
    } else {
      setCategories(categories.filter(c => c.id !== category.id))
      toast.success('Category deleted')
    }
  }

  const handleOpenExpenseDialog = (category: BudgetCategory) => {
    setSelectedCategory(category)
    setExpenseForm({ description: '', amount: '', vendor: '', paid: false, due_date: '' })
    setExpenseDialogOpen(true)
  }

  const handleSaveExpense = async () => {
    if (!selectedCategory || !expenseForm.amount) {
      toast.error('Amount is required')
      return
    }

    setSaving(true)
    const amount = parseFloat(expenseForm.amount) || 0

    const { data, error } = await supabase
      .from('budget_expenses')
      .insert({
        category_id: selectedCategory.id,
        description: expenseForm.description || null,
        amount,
        vendor: expenseForm.vendor || null,
        paid: expenseForm.paid,
        due_date: expenseForm.due_date || null,
      })
      .select()
      .single()

    if (error) {
      toast.error('Failed to add expense')
      setSaving(false)
      return
    }

    // Update the spent amount in the category
    const newSpent = (selectedCategory.spent || 0) + amount
    await supabase
      .from('budget_categories')
      .update({ spent: newSpent, updated_at: new Date().toISOString() })
      .eq('id', selectedCategory.id)

    // Update local state
    setCategories(categories.map(c => 
      c.id === selectedCategory.id 
        ? { ...c, spent: newSpent, expenses: [data, ...(c.expenses || [])] }
        : c
    ))

    toast.success('Expense added')
    setExpenseDialogOpen(false)
    setSaving(false)
  }

  const handleDeleteExpense = async (expense: BudgetExpense, category: CategoryWithExpenses) => {
    if (!confirm('Delete this expense?')) return

    const { error } = await supabase
      .from('budget_expenses')
      .delete()
      .eq('id', expense.id)

    if (error) {
      toast.error('Failed to delete expense')
      return
    }

    // Update the spent amount
    const newSpent = (category.spent || 0) - expense.amount
    await supabase
      .from('budget_categories')
      .update({ spent: Math.max(0, newSpent), updated_at: new Date().toISOString() })
      .eq('id', category.id)

    // Update local state
    setCategories(categories.map(c => 
      c.id === category.id 
        ? { ...c, spent: Math.max(0, newSpent), expenses: c.expenses?.filter(e => e.id !== expense.id) }
        : c
    ))

    toast.success('Expense deleted')
  }

  const handleTogglePaid = async (expense: BudgetExpense) => {
    const { error } = await supabase
      .from('budget_expenses')
      .update({ paid: !expense.paid })
      .eq('id', expense.id)

    if (error) {
      toast.error('Failed to update expense')
      return
    }

    setCategories(categories.map(c => ({
      ...c,
      expenses: c.expenses?.map(e => 
        e.id === expense.id ? { ...e, paid: !e.paid } : e
      )
    })))
  }

  const initializeDefaultCategories = async () => {
    if (!wedding?.id) return
    
    setSaving(true)
    const budgetPerCategory = wedding.budget ? Math.round(wedding.budget / DEFAULT_CATEGORIES.length) : 0

    const { data, error } = await supabase
      .from('budget_categories')
      .insert(DEFAULT_CATEGORIES.map(cat => ({
        wedding_id: wedding.id,
        category: cat,
        allocated: budgetPerCategory,
        spent: 0,
      })))
      .select()

    if (error) {
      toast.error('Failed to create categories')
    } else {
      setCategories(data?.map(c => ({ ...c, expenses: [] })) || [])
      toast.success('Budget categories created!')
    }
    setSaving(false)
  }

  if (weddingLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading budget...</div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Budget
          </h1>
          <p className="text-muted-foreground">
            Track your wedding expenses
          </p>
        </div>
        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenCategoryDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
              <DialogDescription>
                {editingCategory ? 'Update budget category' : 'Add a new budget category'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="catName">Category Name *</Label>
                <Input
                  id="catName"
                  value={categoryForm.category}
                  onChange={(e) => setCategoryForm({ ...categoryForm, category: e.target.value })}
                  placeholder="e.g., Photography"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="allocated">Budget Allocated ($)</Label>
                <Input
                  id="allocated"
                  type="number"
                  value={categoryForm.allocated}
                  onChange={(e) => setCategoryForm({ ...categoryForm, allocated: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveCategory} disabled={saving}>
                {saving ? 'Saving...' : (editingCategory ? 'Update' : 'Add Category')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalAllocated.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toLocaleString()}</div>
            <Progress value={percentSpent} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${remaining < 0 ? 'text-destructive' : ''}`}>
              ${remaining.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">% Used</CardTitle>
            {percentSpent > 90 && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${percentSpent > 100 ? 'text-destructive' : ''}`}>
              {percentSpent}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">No budget categories yet.</p>
            <Button onClick={initializeDefaultCategories} disabled={saving}>
              {saving ? 'Creating...' : 'Create Default Categories'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const catPercent = category.allocated > 0 
              ? Math.round((category.spent / category.allocated) * 100) 
              : 0
            const isOverBudget = category.spent > category.allocated

            return (
              <Card key={category.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenCategoryDialog(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    ${category.spent?.toLocaleString() || 0} of ${category.allocated?.toLocaleString() || 0}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress 
                    value={Math.min(catPercent, 100)} 
                    className={isOverBudget ? '[&>div]:bg-destructive' : ''}
                  />
                  <p className={`text-xs mt-1 ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {catPercent}% used • ${((category.allocated || 0) - (category.spent || 0)).toLocaleString()} remaining
                  </p>

                  {/* Expenses list */}
                  {category.expenses && category.expenses.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-[150px] overflow-y-auto">
                      {category.expenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={expense.paid}
                              onCheckedChange={() => handleTogglePaid(expense)}
                            />
                            <span className={expense.paid ? 'line-through text-muted-foreground' : ''}>
                              {expense.description || expense.vendor || 'Expense'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">${expense.amount.toLocaleString()}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => handleDeleteExpense(expense, category)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => handleOpenExpenseDialog(category)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Add an expense to {selectedCategory?.category}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expAmount">Amount ($) *</Label>
              <Input
                id="expAmount"
                type="number"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expDesc">Description</Label>
              <Input
                id="expDesc"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g., Deposit"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expVendor">Vendor</Label>
              <Input
                id="expVendor"
                value={expenseForm.vendor}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                placeholder="e.g., ABC Photography"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expDue">Due Date</Label>
              <Input
                id="expDue"
                type="date"
                value={expenseForm.due_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="expPaid"
                checked={expenseForm.paid}
                onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, paid: checked as boolean })}
              />
              <Label htmlFor="expPaid">Already paid</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveExpense} disabled={saving}>
              {saving ? 'Saving...' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
