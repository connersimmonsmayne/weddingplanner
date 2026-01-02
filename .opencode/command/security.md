---
description: Run security review before pushing to GitHub
agent: security-review
subtask: true
---

Perform a comprehensive security review of this codebase before pushing to GitHub.

## Files to Review

Here are the currently staged changes:
!`git diff --cached --name-only 2>/dev/null || echo "No staged changes"`

Here is the diff of staged changes:
!`git diff --cached 2>/dev/null || echo "No staged changes"`

If there are no staged changes, review all tracked files:
!`git ls-files`

## Project Context

This is a **wedding planner web application** that handles sensitive personal information:
- Guest names, addresses, phone numbers, emails
- Wedding dates and locations
- Budget and financial information
- Vendor contacts

The app uses:
- Next.js 14 with App Router
- Supabase for auth and database (with RLS)
- TypeScript
- Environment variables for secrets

## Your Task

1. Review the staged changes (or all files if nothing staged)
2. Check for any security vulnerabilities
3. Verify no secrets or PII are being committed
4. Confirm multi-tenant isolation is maintained
5. Provide a clear SAFE TO PUSH or DO NOT PUSH recommendation
