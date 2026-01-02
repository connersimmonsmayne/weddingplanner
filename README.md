# Wedding Planner

A multi-tenant wedding planning web application built with Next.js, Supabase, and shadcn/ui.

## Features

- **Multi-tenant architecture** - Each couple gets their own isolated wedding plan
- **Guest management** - Track RSVPs, dietary restrictions, addresses, plus-ones
- **Budget tracking** - Categories, expenses, and progress visualization
- **Vendor management** - Compare quotes, track status, store contacts
- **Task management** - To-do lists with priorities and due dates
- **Timeline planning** - Day-of schedule and master timeline
- **Event planning** - Rehearsal dinner, bachelor/bachelorette parties
- **CSV import** - Bulk import guests from spreadsheets
- **Invite codes** - Partners can join wedding plans with a code

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### 1. Clone the repo

```bash
git clone https://github.com/connersimmonsmayne/weddingplanner.git
cd weddingplanner
```

### 2. Set up Supabase

1. Create a new Supabase project
2. Run the database schema (see [Database Schema](#database-schema) below)
3. Enable Email auth in Authentication settings
4. Disable "Confirm email" for development

### 3. Configure environment

```bash
cd app
cp .env.local.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## Database Schema

Tables:
- `weddings` - Wedding plans
- `wedding_members` - User-wedding relationships (admin/member roles)
- `guests` - Guest list with RSVP tracking
- `budget_categories` - Budget categories and allocations
- `budget_expenses` - Individual expenses
- `vendors` - Vendor contacts and quotes
- `tasks` - To-do items
- `timeline_events` - Day-of and master timeline
- `events` - Related events (rehearsal dinner, parties)

All tables use Row Level Security (RLS) for data isolation.

## Deployment

### Vercel

1. Import the repo in Vercel
2. Set **Root Directory** to `app`
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Development

### Adding new features

1. Create/update Supabase table if needed
2. Update types in `src/types/database.ts`
3. Create page in `src/app/(app)/`
4. Update navigation in `src/components/layout/navigation.tsx`

### Code style

- Use TypeScript strict mode
- Follow existing component patterns
- Use shadcn/ui components where possible
- Use Sonner for toast notifications

## License

MIT
