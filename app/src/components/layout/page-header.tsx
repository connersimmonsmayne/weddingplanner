'use client'

import { cn } from '@/lib/utils'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  count?: number
  countLabel?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  count,
  countLabel,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
        {count !== undefined && countLabel && (
          <p className="text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{count.toLocaleString()}</span>{' '}
            {countLabel}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface GreetingHeaderProps {
  userName?: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function GreetingHeader({
  userName,
  subtitle,
  children,
  className,
}: GreetingHeaderProps) {
  const greeting = getGreeting()

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
        {subtitle && (
          <p className="text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
