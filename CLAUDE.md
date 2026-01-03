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

## Feature Development Workflow

Always use feature branches with Vercel previews before merging to main.

### Branch Naming
- `feature/` - new features (e.g., `feature/guest-import`)
- `fix/` - bug fixes (e.g., `fix/responsive-layout`)

### Workflow

1. **Create branch from main**
   ```bash
   git checkout main && git pull
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add . && git commit -m "Description of changes"
   ```

3. **Push and create PR**
   ```bash
   git push -u origin feature/your-feature-name
   gh pr create --title "Feature title" --body "Description"
   ```

4. **Test on Vercel preview** - PR triggers automatic preview deployment

5. **Merge when ready** - Use GitHub UI or `gh pr merge`
