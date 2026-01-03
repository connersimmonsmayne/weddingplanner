# CLAUDE.md

Quick reference for Claude Code. For comprehensive details, see [AGENTS.md](./AGENTS.md).

## Build Commands

All commands run from `app/` directory:

```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build + TypeScript check
npm run lint      # ESLint
```

## Key Architecture

- **Stack**: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, Supabase
- **Protected routes**: `app/src/app/(app)/` - require auth + wedding selection
- **Public routes**: `app/src/app/` - login, signup, join, new, select

## Critical Patterns

### Multi-Tenant Isolation

**Always filter by `wedding_id`** - this is enforced by RLS but must be in queries:

```typescript
const { data } = await supabase
  .from('guests')
  .select('*')
  .eq('wedding_id', wedding.id)
```

### Supabase Clients

```typescript
// Client-side (hooks, event handlers)
import { createClient } from '@/lib/supabase/client'

// Server-side (server components, route handlers)
import { createClient } from '@/lib/supabase/server'
```

### Wedding Context

```typescript
import { useWedding } from '@/components/providers/wedding-provider'
const { wedding } = useWedding()
```

## Quick References

- **UI components**: `@/components/ui/` (shadcn/ui)
- **Toast**: `import { toast } from 'sonner'`
- **Icons**: `import { Icon } from 'lucide-react'`
- **Utilities**: `cn()` from `@/lib/utils`
- **Types**: `import { Wedding, Guest } from '@/types/database'`
