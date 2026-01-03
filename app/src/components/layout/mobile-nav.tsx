'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useWedding } from '@/components/providers/wedding-provider'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Store,
  Calendar,
  PartyPopper,
  Settings,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/guests', label: 'Guests', icon: Users },
  { href: '/budget', label: 'Budget', icon: Wallet },
  { href: '/vendors', label: 'Vendors', icon: Store },
  { href: '/timeline', label: 'Timeline', icon: Calendar },
  { href: '/events', label: 'Events', icon: PartyPopper },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const weddingId = searchParams.get('wedding')
  const { wedding } = useWedding()

  const [isOpen, setIsOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Load dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('dark-mode')
    if (savedDarkMode !== null) {
      setIsDarkMode(JSON.parse(savedDarkMode))
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true)
    }
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newState = !isDarkMode
    setIsDarkMode(newState)
    localStorage.setItem('dark-mode', JSON.stringify(newState))
    document.documentElement.classList.toggle('dark', newState)
  }

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card shadow-sm flex items-center px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="mr-3"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="Wedding Planner"
            width={32}
            height={32}
            className="object-contain"
          />
          <span className="font-semibold text-sm">
            {wedding?.name || 'Wedding Planner'}
          </span>
        </div>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <div
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar shadow-xl transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="Wedding Planner"
              width={32}
              height={32}
              className="object-contain"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm">Wedding Planner</span>
              {wedding && (
                <span className="text-xs text-muted-foreground truncate">
                  {wedding.name}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close menu</span>
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={`${item.href}?wedding=${weddingId}`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary-foreground")} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <Link
            href="/select"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-150"
          >
            <LogOut className="h-5 w-5" />
            <span>Switch Wedding</span>
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all duration-150 w-full"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="md:hidden h-14" />
    </>
  )
}
