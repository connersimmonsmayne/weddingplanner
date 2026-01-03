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
  ChevronLeft,
  ChevronRight,
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
]

const bottomNavItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const weddingId = searchParams.get('wedding')
  const { wedding } = useWedding()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load collapsed state and dark mode from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('sidebar-collapsed')
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed))
    }

    // Check for saved dark mode preference or system preference
    const savedDarkMode = localStorage.getItem('dark-mode')
    if (savedDarkMode !== null) {
      const isDark = JSON.parse(savedDarkMode)
      setIsDarkMode(isDark)
      document.documentElement.classList.toggle('dark', isDark)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
  }

  // Auto-collapse when clicking a nav item
  const handleNavClick = () => {
    if (!isCollapsed) {
      setIsCollapsed(true)
      localStorage.setItem('sidebar-collapsed', JSON.stringify(true))
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newState = !isDarkMode
    setIsDarkMode(newState)
    localStorage.setItem('dark-mode', JSON.stringify(newState))
    document.documentElement.classList.toggle('dark', newState)
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-screen shadow-sidebar sticky top-0 transition-all duration-300 ease-in-out",
        "bg-gradient-to-b from-sidebar via-sidebar to-[color-mix(in_oklch,var(--sidebar)_97%,var(--primary)_3%)]",
        isCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Header / Brand */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        isCollapsed ? "justify-center" : "gap-3"
      )}>
        <div className="flex items-center justify-center w-10 h-10 flex-shrink-0">
          <Image
            src="/logo.svg"
            alt="Wedding Planner"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate">Wedding Planner</span>
            {wedding && (
              <span className="text-xs text-muted-foreground truncate">
                {wedding.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={`${item.href}?wedding=${weddingId}`}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary-foreground")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-sidebar-border py-4 px-3">
        <div className="space-y-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={`${item.href}?wedding=${weddingId}`}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                  isCollapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary-foreground")} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}

          {/* Switch Wedding */}
          <Link
            href="/select"
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? "Switch Wedding" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Switch Wedding</span>}
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? (isDarkMode ? "Light Mode" : "Dark Mode") : undefined}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 flex-shrink-0" />
            ) : (
              <Moon className="h-5 w-5 flex-shrink-0" />
            )}
            {!isCollapsed && <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size={isCollapsed ? "icon-sm" : "sm"}
          onClick={toggleCollapsed}
          className={cn(
            "mt-3 border-sidebar-border",
            isCollapsed ? "w-full" : "w-full justify-start"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  )
}
