# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project Overview

Wedding Planner is a multi-tenant web application for planning weddings. Built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

## Directory Structure

```
weddingplanner/
├── app/                      # Next.js application (root for Vercel)
│   ├── src/
│   │   ├── app/              # App Router pages
│   │   │   ├── (app)/        # Protected routes (require auth + wedding)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── guests/
│   │   │   │   ├── budget/
│   │   │   │   ├── vendors/
│   │   │   │   ├── timeline/
│   │   │   │   ├── events/
│   │   │   │   └── settings/
│   │   │   ├── login/        # Auth pages
│   │   │   ├── signup/
│   │   │   ├── join/         # Join via invite code
│   │   │   ├── new/          # Create wedding
│   │   │   └── select/       # Wedding selector
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Navigation, etc.
│   │   │   └── providers/    # React context providers
│   │   ├── lib/
│   │   │   └── supabase/     # Supabase client utilities
│   │   └── types/
│   │       └── database.ts   # Database types
│   └── .env.local            # Environment variables (not committed)
└── AGENTS.md
```

## Build/Lint/Test Commands

All commands run from `app/` directory:

```bash
# Development
npm run dev              # Start dev server at localhost:3000

# Build
npm run build            # Production build (also runs TypeScript check)

# Linting
npm run lint             # Run ESLint

# Type checking (no separate command, use build)
npm run build            # TypeScript errors will fail the build
```

No test framework is currently configured.

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - No implicit any, strict null checks
- Use `interface` for object shapes, `type` for unions/intersections
- Export helper types from `@/types/database.ts`:
  ```typescript
  import { Wedding, Guest, Task } from '@/types/database'
  ```
- Non-null assertions (`!`) only for env vars:
  ```typescript
  process.env.NEXT_PUBLIC_SUPABASE_URL!
  ```

### Imports

Order imports as follows (with blank lines between groups):
1. React/Next.js
2. Third-party libraries
3. Internal aliases (`@/`)
4. Relative imports

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { useWedding } from '@/components/providers/wedding-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { Wedding, Guest } from '@/types/database'
```

### Path Aliases

Use `@/` for all imports from `src/`:
```typescript
import { cn } from '@/lib/utils'           // ✓
import { cn } from '../../lib/utils'       // ✗
```

### Components

- Use `'use client'` directive for client components (hooks, interactivity)
- Server components are default (no directive needed)
- Use shadcn/ui components from `@/components/ui/`
- Use `cn()` utility for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils'
  className={cn("base-classes", isActive && "active-classes")}
  ```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `wedding-provider.tsx` |
| Components | PascalCase | `WeddingProvider` |
| Functions | camelCase | `fetchWedding` |
| Constants | camelCase | `navItems` |
| Types/Interfaces | PascalCase | `DashboardStats` |
| Database tables | snake_case | `wedding_members` |

### React Patterns

- Prefer functional components with hooks
- Use `useState` for local state
- Use context providers for shared state (see `WeddingProvider`)
- Handle loading states explicitly:
  ```typescript
  const [loading, setLoading] = useState(true)
  if (loading) return <LoadingSpinner />
  ```

### Supabase

- **Client-side**: `import { createClient } from '@/lib/supabase/client'`
- **Server-side**: `import { createClient } from '@/lib/supabase/server'`
- Always filter by `wedding_id` for multi-tenant isolation:
  ```typescript
  const { data } = await supabase
    .from('guests')
    .select('*')
    .eq('wedding_id', wedding.id)
  ```

### Error Handling

- Use `toast` from Sonner for user feedback:
  ```typescript
  import { toast } from 'sonner'
  
  if (error) {
    toast.error(error.message)
    return
  }
  toast.success('Saved successfully!')
  ```
- Silent catch for non-critical operations (e.g., cookie setting in SSR)

### Forms

- Use controlled inputs with `useState`
- Disable submit button while loading
- Show loading state in button text:
  ```typescript
  <Button disabled={loading}>
    {loading ? 'Saving...' : 'Save'}
  </Button>
  ```

### Styling

- Tailwind CSS for all styling
- Use shadcn/ui component variants:
  ```typescript
  <Button variant="destructive" size="sm">Delete</Button>
  <Badge variant="outline">Pending</Badge>
  ```
- Common color patterns:
  - `text-muted-foreground` - secondary text
  - `bg-muted` - subtle backgrounds
  - `text-destructive` - errors/warnings

### Icons

Use Lucide React icons:
```typescript
import { Users, Wallet, Calendar } from 'lucide-react'
<Users className="h-4 w-4" />
```

## Environment Variables

Required in `app/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Key Patterns

### Protected Routes

All routes under `(app)/` require:
1. Authentication (handled by middleware)
2. Wedding selection via `?wedding=<id>` query param
3. Membership verification (handled by `WeddingProvider`)

### Adding a New Feature Page

1. Create `app/src/app/(app)/feature-name/page.tsx`
2. Add `'use client'` if using hooks
3. Use `useWedding()` hook for wedding context
4. Add navigation link in `components/layout/navigation.tsx`
5. Update database types in `types/database.ts` if needed

### Database Changes

1. Update Supabase schema via dashboard or migrations
2. Update `src/types/database.ts` with new types
3. Add RLS policies for new tables
