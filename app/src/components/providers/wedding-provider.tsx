'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Wedding, WeddingMember } from '@/types/database'

interface WeddingContextType {
  wedding: Wedding | null
  membership: WeddingMember | null
  isAdmin: boolean
  loading: boolean
  refreshWedding: () => Promise<void>
}

const WeddingContext = createContext<WeddingContextType>({
  wedding: null,
  membership: null,
  isAdmin: false,
  loading: true,
  refreshWedding: async () => {},
})

export function useWedding() {
  return useContext(WeddingContext)
}

interface WeddingProviderProps {
  children: ReactNode
  initialWedding?: Wedding | null
  initialMembership?: WeddingMember | null
}

export function WeddingProvider({ 
  children, 
  initialWedding = null,
  initialMembership = null 
}: WeddingProviderProps) {
  const [wedding, setWedding] = useState<Wedding | null>(initialWedding)
  const [membership, setMembership] = useState<WeddingMember | null>(initialMembership)
  const [loading, setLoading] = useState(!initialWedding)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const weddingId = searchParams.get('wedding')

  const fetchWedding = async () => {
    if (!weddingId) {
      router.push('/select')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get membership and wedding data
    const { data: membershipData, error: membershipError } = await supabase
      .from('wedding_members')
      .select('*')
      .eq('wedding_id', weddingId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membershipData) {
      // User is not a member of this wedding
      router.push('/select')
      return
    }

    const { data: weddingData, error: weddingError } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .single()

    if (weddingError || !weddingData) {
      router.push('/select')
      return
    }

    setMembership(membershipData)
    setWedding(weddingData)
    setLoading(false)
  }

  useEffect(() => {
    if (!initialWedding && weddingId) {
      fetchWedding()
    }
  }, [weddingId])

  const refreshWedding = async () => {
    await fetchWedding()
  }

  return (
    <WeddingContext.Provider value={{
      wedding,
      membership,
      isAdmin: membership?.role === 'admin',
      loading,
      refreshWedding,
    }}>
      {children}
    </WeddingContext.Provider>
  )
}
