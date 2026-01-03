# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Lint Commands

All commands run from `app/` directory:

```bash
npm run dev       # Start dev server at localhost:3000
npm run build     # Production build (also runs TypeScript check)
npm run lint      # Run ESLint
```

No test framework is currently configured.

## Architecture Overview

Multi-tenant wedding planning app using Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, and Supabase.

### Key Directories

- `app/src/app/(app)/` - Protected routes requiring auth + wedding selection
- `app/src/app/` - Public routes (login, signup, join, new, select)
- `app/src/components/providers/` - React context providers (WeddingProvider)
- `app/src/lib/supabase/` - Client and server Supabase utilities
- `app/src/types/database.ts` - Database types and helper exports

### Multi-Tenant Isolation

- All data queries must filter by `wedding_id`
- Wedding context accessed via `useWedding()` hook from WeddingProvider
- Protected routes use `?wedding=<id>` query param
- Supabase RLS policies enforce data isolation at database level

### Supabase Clients

```typescript
// Client-side (hooks, event handlers)
import { createClient } from '@/lib/supabase/client'

// Server-side (server components, route handlers)
import { createClient } from '@/lib/supabase/server'
```

### UI Patterns

- Use shadcn/ui components from `@/components/ui/`
- Toast notifications via Sonner: `import { toast } from 'sonner'`
- Icons from Lucide React
- Utility: `cn()` from `@/lib/utils` for conditional classes

## Code Style

See AGENTS.md for detailed code style guidelines including import ordering, naming conventions, and React patterns.
