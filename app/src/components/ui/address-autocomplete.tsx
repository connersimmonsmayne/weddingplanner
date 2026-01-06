'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { MapPin, Loader2 } from 'lucide-react'

export interface AddressResult {
  streetAddress: string
  city: string
  state: string
  zipCode: string
  fullAddress: string
  latitude: number
  longitude: number
}

interface PhotonFeature {
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  geometry: {
    coordinates: [number, number] // [lng, lat]
  }
}

interface AddressAutocompleteProps {
  value?: string
  onSelect: (address: AddressResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function AddressAutocomplete({
  value = '',
  onSelect,
  placeholder = 'Start typing an address...',
  className,
  disabled,
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const debouncedInput = useDebounce(inputValue, 300)

  // Update input when external value changes
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Search for addresses using Photon API
  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=10&lang=en`
      )

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      const features: PhotonFeature[] = data.features || []

      const results: AddressResult[] = features
        .filter(f => f.properties.country === 'United States')
        .map((feature) => {
          const props = feature.properties
          const streetAddress = props.housenumber
            ? `${props.housenumber} ${props.street || props.name || ''}`
            : (props.street || props.name || '')

          const city = props.city || ''
          const state = props.state || ''
          const zipCode = props.postcode || ''

          const parts = [streetAddress, city, state, zipCode].filter(Boolean)
          const fullAddress = parts.join(', ')

          return {
            streetAddress: streetAddress.trim(),
            city,
            state,
            zipCode,
            fullAddress,
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
          }
        })
        .filter(r => r.streetAddress && r.city) // Only show results with street and city

      setSuggestions(results)
      setIsOpen(results.length > 0)
      setSelectedIndex(-1)
    } catch (error) {
      console.error('Address search error:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger search on debounced input change
  useEffect(() => {
    if (debouncedInput && debouncedInput.length >= 3) {
      searchAddresses(debouncedInput)
    } else {
      setSuggestions([])
      setIsOpen(false)
    }
  }, [debouncedInput, searchAddresses])

  const handleSelect = (address: AddressResult) => {
    setInputValue(address.fullAddress)
    setSuggestions([])
    setIsOpen(false)
    onSelect(address)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn('pl-9', className)}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'px-3 py-2 cursor-pointer text-sm transition-colors',
                index === selectedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <div className="font-medium">{suggestion.streetAddress}</div>
              <div className="text-xs text-muted-foreground">
                {suggestion.city}, {suggestion.state} {suggestion.zipCode}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
