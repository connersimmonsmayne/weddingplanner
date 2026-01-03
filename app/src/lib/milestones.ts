import { SupabaseClient } from '@supabase/supabase-js'

export type MilestoneStatus = 'complete' | 'in_progress' | 'not_started'

export interface Milestone {
  id: string
  label: string
  status: MilestoneStatus
  detail: string
  description: string
  link?: string
  linkLabel?: string
}

export interface MilestoneData {
  milestones: Milestone[]
  nextMilestone: Milestone | null
  completedCount: number
  totalCount: number
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
]

export async function fetchMilestoneData(
  supabase: SupabaseClient,
  weddingId: string,
  weddingDate?: string | null
): Promise<MilestoneData> {
  // Fetch all data in parallel
  const [
    { data: vendors },
    { data: guests },
    { data: tasks },
    { data: events },
  ] = await Promise.all([
    supabase
      .from('vendors')
      .select('category, status, name')
      .eq('wedding_id', weddingId),
    supabase
      .from('guests')
      .select('rsvp_status')
      .eq('wedding_id', weddingId),
    supabase
      .from('tasks')
      .select('title, status, due_date')
      .eq('wedding_id', weddingId),
    supabase
      .from('events')
      .select('event_type')
      .eq('wedding_id', weddingId),
  ])

  // Helper to check if a task matching keyword is completed
  const hasCompletedTask = (keyword: string): boolean => {
    return tasks?.some(t =>
      t.status === 'completed' &&
      t.title.toLowerCase().includes(keyword.toLowerCase())
    ) || false
  }

  // 1. Book Venue
  const venueVendor = vendors?.find(v => v.category === 'Venue' && v.status === 'booked')
  const venueStatus: MilestoneStatus = venueVendor ? 'complete' : 'not_started'
  const venueMilestone: Milestone = {
    id: 'venue',
    label: 'Book Venue',
    status: venueStatus,
    detail: venueVendor ? venueVendor.name || 'Booked' : 'Find your perfect venue',
    description: 'Secure your wedding venue',
    link: '/vendors',
    linkLabel: 'View vendors',
  }

  // 2. Send Save the Dates
  const saveTheDateCompleted = hasCompletedTask('save the date')
  const saveTheDateMilestone: Milestone = {
    id: 'save-the-dates',
    label: 'Send Save the Dates',
    status: saveTheDateCompleted ? 'complete' : 'not_started',
    detail: saveTheDateCompleted ? 'Sent' : 'Notify your guests',
    description: 'Let guests know to save your date',
    link: '/timeline',
    linkLabel: 'View tasks',
  }

  // 3. Book Vendors
  const bookedCategories = new Set<string>()
  vendors?.forEach(v => {
    if (v.status === 'booked' && v.category !== 'Venue') {
      bookedCategories.add(v.category)
    }
  })
  const vendorsBooked = bookedCategories.size
  const vendorsTotal = VENDOR_CATEGORIES.length
  const vendorStatus: MilestoneStatus = vendorsBooked === vendorsTotal
    ? 'complete'
    : vendorsBooked > 0
      ? 'in_progress'
      : 'not_started'
  const vendorMilestone: Milestone = {
    id: 'vendors',
    label: 'Book Vendors',
    status: vendorStatus,
    detail: `${vendorsBooked}/${vendorsTotal} booked`,
    description: 'Photography, catering, music & more',
    link: '/vendors',
    linkLabel: 'View vendors',
  }

  // 4. Create Registry
  const registryCompleted = hasCompletedTask('registry')
  const registryMilestone: Milestone = {
    id: 'registry',
    label: 'Create Registry',
    status: registryCompleted ? 'complete' : 'not_started',
    detail: registryCompleted ? 'Created' : 'Set up your gift registry',
    description: 'Help guests know what to gift',
    link: '/timeline',
    linkLabel: 'View tasks',
  }

  // 5. Send Invitations
  const invitationsCompleted = hasCompletedTask('invitation')
  const invitationsMilestone: Milestone = {
    id: 'invitations',
    label: 'Send Invitations',
    status: invitationsCompleted ? 'complete' : 'not_started',
    detail: invitationsCompleted ? 'Sent' : 'Send out your invites',
    description: 'Formally invite your guests',
    link: '/timeline',
    linkLabel: 'View tasks',
  }

  // 6. Collect RSVPs
  const totalGuests = guests?.length || 0
  const respondedGuests = guests?.filter(g => g.rsvp_status !== 'pending').length || 0
  const rsvpStatus: MilestoneStatus = totalGuests === 0
    ? 'not_started'
    : respondedGuests === totalGuests
      ? 'complete'
      : respondedGuests > 0
        ? 'in_progress'
        : 'not_started'
  const rsvpMilestone: Milestone = {
    id: 'rsvps',
    label: 'Collect RSVPs',
    status: rsvpStatus,
    detail: totalGuests > 0
      ? `${Math.round((respondedGuests / totalGuests) * 100)}% responded`
      : 'Add guests first',
    description: 'Track guest responses',
    link: '/guests',
    linkLabel: 'View guests',
  }

  // 7. Finalize Details
  let finalMonthTasks = { completed: 0, total: 0 }
  if (weddingDate) {
    const wedding = new Date(weddingDate)
    const oneMonthBefore = new Date(wedding)
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1)

    const finalTasks = tasks?.filter(t => {
      if (!t.due_date) return false
      const dueDate = new Date(t.due_date)
      return dueDate >= oneMonthBefore && dueDate <= wedding
    }) || []

    finalMonthTasks = {
      total: finalTasks.length,
      completed: finalTasks.filter(t => t.status === 'completed').length,
    }
  }
  const finalStatus: MilestoneStatus = finalMonthTasks.total === 0
    ? 'not_started'
    : finalMonthTasks.completed === finalMonthTasks.total
      ? 'complete'
      : finalMonthTasks.completed > 0
        ? 'in_progress'
        : 'not_started'
  const finalDetailsMilestone: Milestone = {
    id: 'final-details',
    label: 'Finalize Details',
    status: finalStatus,
    detail: finalMonthTasks.total > 0
      ? `${finalMonthTasks.completed}/${finalMonthTasks.total} tasks`
      : 'Tasks will appear here',
    description: 'Complete final month preparations',
    link: '/timeline',
    linkLabel: 'View tasks',
  }

  // 8. Rehearsal
  const hasRehearsalEvent = events?.some(e => e.event_type === 'rehearsal_dinner')
  const rehearsalTaskCompleted = hasCompletedTask('rehearsal')
  const rehearsalStatus: MilestoneStatus = (hasRehearsalEvent || rehearsalTaskCompleted)
    ? 'complete'
    : 'not_started'
  const rehearsalMilestone: Milestone = {
    id: 'rehearsal',
    label: 'Rehearsal',
    status: rehearsalStatus,
    detail: rehearsalStatus === 'complete' ? 'Planned' : 'Plan your rehearsal dinner',
    description: 'Practice for the big day',
    link: '/timeline',
    linkLabel: 'View tasks',
  }

  // 9. Wedding Day
  const isWeddingDayPassed = weddingDate ? new Date(weddingDate) <= new Date() : false
  const weddingDayMilestone: Milestone = {
    id: 'wedding-day',
    label: 'Wedding Day',
    status: isWeddingDayPassed ? 'complete' : 'not_started',
    detail: isWeddingDayPassed ? 'Congratulations!' : 'Your special day awaits',
    description: 'Celebrate your love',
  }

  const milestones: Milestone[] = [
    venueMilestone,
    saveTheDateMilestone,
    vendorMilestone,
    registryMilestone,
    invitationsMilestone,
    rsvpMilestone,
    finalDetailsMilestone,
    rehearsalMilestone,
    weddingDayMilestone,
  ]

  const completedCount = milestones.filter(m => m.status === 'complete').length
  const nextMilestone = milestones.find(m => m.status !== 'complete') || null

  return {
    milestones,
    nextMilestone,
    completedCount,
    totalCount: milestones.length,
  }
}
