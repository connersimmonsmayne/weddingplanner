Perform a comprehensive security review before pushing to GitHub.

## Files to Review

Staged changes:
```
$git diff --cached --name-only 2>/dev/null || echo "No staged changes"
```

Diff of staged changes:
```
$git diff --cached 2>/dev/null || echo "No staged changes"
```

If no staged changes, review all tracked files:
```
$git ls-files
```

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

## Review Checklist

### 1. Secrets & Credentials
- API keys, tokens, passwords in code or config files
- Hardcoded credentials or connection strings
- Private keys or certificates
- Environment variables with sensitive defaults

### 2. Exposed Sensitive Data
- PII in code or comments
- Email addresses, phone numbers, physical addresses
- Database connection strings
- Internal URLs or IP addresses

### 3. Authentication & Authorization
- Proper auth checks on protected routes
- Session management vulnerabilities
- Missing or weak access controls
- JWT/token handling issues

### 4. Common Vulnerabilities
- SQL injection risks (even with ORMs)
- XSS vulnerabilities in rendered content
- CSRF protection gaps
- Insecure direct object references
- Path traversal vulnerabilities

### 5. Dependencies & Configuration
- Known vulnerable dependencies (check package.json)
- Insecure default configurations
- Missing security headers
- Overly permissive CORS settings

### 6. Supabase-Specific Security
- RLS (Row Level Security) policy gaps
- Exposed anon key usage patterns
- Missing `wedding_id` filters (multi-tenant isolation)
- Direct database access without proper scoping

## Output Format

Provide findings as:

### Security Review Summary

**Risk Level**: [CRITICAL / HIGH / MEDIUM / LOW / CLEAR]

### Findings

For each issue:
- **Issue**: Brief description
- **Location**: File path and line number
- **Risk**: Critical/High/Medium/Low
- **Recommendation**: How to fix

### Checklist
- [ ] No hardcoded secrets or API keys
- [ ] No PII or sensitive data in code
- [ ] Authentication properly implemented
- [ ] Authorization checks in place
- [ ] Input validation present
- [ ] No SQL injection vulnerabilities
- [ ] XSS protection in place
- [ ] Dependencies are up to date
- [ ] Supabase RLS properly configured
- [ ] Multi-tenant isolation maintained

### Recommendation

State whether it is **SAFE TO PUSH** or **DO NOT PUSH** with explanation.
