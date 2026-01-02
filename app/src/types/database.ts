export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      weddings: {
        Row: {
          id: string
          name: string
          partner1_name: string
          partner2_name: string
          wedding_date: string | null
          budget: number | null
          location: string | null
          invite_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          partner1_name: string
          partner2_name: string
          wedding_date?: string | null
          budget?: number | null
          location?: string | null
          invite_code: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          partner1_name?: string
          partner2_name?: string
          wedding_date?: string | null
          budget?: number | null
          location?: string | null
          invite_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      wedding_members: {
        Row: {
          id: string
          wedding_id: string
          user_id: string
          role: 'admin' | 'member'
          display_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          user_id: string
          role?: 'admin' | 'member'
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          display_name?: string | null
          created_at?: string
        }
      }
      guests: {
        Row: {
          id: string
          wedding_id: string
          name: string
          group_name: string | null
          relationship: string | null
          priority: string | null
          plus_one: string | null
          address: string | null
          notes: string | null
          rsvp_status: 'pending' | 'confirmed' | 'declined'
          dietary_restrictions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          name: string
          group_name?: string | null
          relationship?: string | null
          priority?: string | null
          plus_one?: string | null
          address?: string | null
          notes?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'declined'
          dietary_restrictions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          name?: string
          group_name?: string | null
          relationship?: string | null
          priority?: string | null
          plus_one?: string | null
          address?: string | null
          notes?: string | null
          rsvp_status?: 'pending' | 'confirmed' | 'declined'
          dietary_restrictions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      budget_categories: {
        Row: {
          id: string
          wedding_id: string
          category: string
          allocated: number
          spent: number
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          category: string
          allocated?: number
          spent?: number
          notes?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          category?: string
          allocated?: number
          spent?: number
          notes?: string | null
          updated_at?: string
        }
      }
      budget_expenses: {
        Row: {
          id: string
          category_id: string
          wedding_id: string
          description: string | null
          amount: number
          vendor: string | null
          paid: boolean
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          wedding_id: string
          description?: string | null
          amount: number
          vendor?: string | null
          paid?: boolean
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          wedding_id?: string
          description?: string | null
          amount?: number
          vendor?: string | null
          paid?: boolean
          due_date?: string | null
          created_at?: string
        }
      }
      vendors: {
        Row: {
          id: string
          wedding_id: string
          category: string
          name: string
          contact_name: string | null
          phone: string | null
          email: string | null
          website: string | null
          quote: number | null
          package_details: string | null
          status: 'researching' | 'contacted' | 'booked' | 'rejected'
          rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          category: string
          name: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          quote?: number | null
          package_details?: string | null
          status?: 'researching' | 'contacted' | 'booked' | 'rejected'
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          category?: string
          name?: string
          contact_name?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          quote?: number | null
          package_details?: string | null
          status?: 'researching' | 'contacted' | 'booked' | 'rejected'
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          wedding_id: string
          category: string | null
          title: string
          description: string | null
          owner: string
          due_date: string | null
          status: 'pending' | 'in_progress' | 'completed'
          priority: 'high' | 'medium' | 'low'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          category?: string | null
          title: string
          description?: string | null
          owner?: string
          due_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'high' | 'medium' | 'low'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          category?: string | null
          title?: string
          description?: string | null
          owner?: string
          due_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'high' | 'medium' | 'low'
          created_at?: string
          updated_at?: string
        }
      }
      timeline_events: {
        Row: {
          id: string
          wedding_id: string
          timeline_type: 'master' | 'day-of'
          event_date: string | null
          event_time: string | null
          title: string
          description: string | null
          location: string | null
          who: string | null
          sort_order: number | null
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          timeline_type: 'master' | 'day-of'
          event_date?: string | null
          event_time?: string | null
          title: string
          description?: string | null
          location?: string | null
          who?: string | null
          sort_order?: number | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          timeline_type?: 'master' | 'day-of'
          event_date?: string | null
          event_time?: string | null
          title?: string
          description?: string | null
          location?: string | null
          who?: string | null
          sort_order?: number | null
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          wedding_id: string
          event_type: string
          title: string | null
          event_date: string | null
          location: string | null
          budget: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wedding_id: string
          event_type: string
          title?: string | null
          event_date?: string | null
          location?: string | null
          budget?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wedding_id?: string
          event_type?: string
          title?: string | null
          event_date?: string | null
          location?: string | null
          budget?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Helper types
export type Wedding = Database['public']['Tables']['weddings']['Row']
export type WeddingMember = Database['public']['Tables']['wedding_members']['Row']
export type Guest = Database['public']['Tables']['guests']['Row']
export type BudgetCategory = Database['public']['Tables']['budget_categories']['Row']
export type BudgetExpense = Database['public']['Tables']['budget_expenses']['Row']
export type Vendor = Database['public']['Tables']['vendors']['Row']
export type Task = Database['public']['Tables']['tasks']['Row']
export type TimelineEvent = Database['public']['Tables']['timeline_events']['Row']
export type WeddingEvent = Database['public']['Tables']['events']['Row']
