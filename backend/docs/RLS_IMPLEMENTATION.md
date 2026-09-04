# Row Level Security (RLS) Implementation Guide

## Overview
This document outlines the Row Level Security (RLS) policies implemented across all public tables in the College Management System database to address Supabase security linter warnings.

## Security Linter Issues Fixed

### 1. RLS Disabled in Public (0013)
**Status**: ✅ Fixed
**Affected Tables**: 17 tables (issue_followers, comments, issue_participants, issue_resolutions, resolution_evidence, issues, users, audit_logs, issue_reports, issue_disputes, notifications, ai_analysis, issue_embeddings, issue_status_history, sessions, upload_references, assets)

**Solution**: Enabled RLS on all public tables and created appropriate access control policies.

### 2. Sensitive Columns Exposed (0023)
**Status**: ⚠️ Requires API-level handling
**Affected Table**: `public.users` (password column)

**Solution**: While RLS policies protect at the database level, the password column should NEVER be selected in API responses. See recommendations below.

## RLS Policy Structure by Table

### User-Scoped Tables
These tables restrict access to the authenticated user's own data:

| Table | View | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| **users** | Own data only* | N/A | Own profile | N/A |
| **sessions** | Own sessions | N/A | N/A | Own sessions |
| **notifications** | Own notifications | System only | Own notifications | Own notifications |
| **upload_references** | Own uploads | Own uploads | Own uploads | Own uploads |

*\*Admins can view all users*

### Public with Role-Based Control
These tables allow public viewing but restrict modifications:

| Table | View | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| **issues** | All users | Authenticated users | Reporter + Admins | N/A |
| **comments** | All users | Authenticated users | Author + Admins | Author |
| **issue_followers** | All users | Self only | Self only | Self only |
| **issue_participants** | All users | Admins only | Admins only | N/A |
| **issue_resolutions** | All users | Admins/Officials | Admins only | N/A |
| **resolution_evidence** | All users | Admins/Officials | Admins/Officials | N/A |
| **assets** | All users | Admins/Officials | Admins/Officials | N/A |

### Admin/Staff Only
These tables are restricted to administrative personnel:

| Table | View | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| **issue_reports** | Own issues + Admins | Users (on others' issues) | Admins | N/A |
| **issue_disputes** | Own disputes + Admins | Users | Admins | N/A |
| **audit_logs** | Admins only | System only | N/A | N/A |
| **issue_status_history** | All users | System only | N/A | N/A |

### System-Managed Tables
These tables are managed by backend services:

| Table | Detail |
|-------|--------|
| **ai_analysis** | All users can read; system manages all writes |
| **issue_embeddings** | All users can read; system manages all writes |

## Role-Based Access Levels

### STUDENT
- View public issues and comments
- Create issues
- Comment on issues
- Follow/unfollow issues
- Report issues as spam/duplicate
- Create disputes on resolutions
- View own notifications
- Manage own profile and sessions

### OFFICIAL
- All STUDENT permissions
- Create and manage issue resolutions
- Upload resolution evidence
- Manage assets
- View status history

### MODERATOR
- All OFFICIAL permissions
- View all user reports
- View and manage disputes
- Manage issue status and flags
- View audit logs

### ADMIN
- Full access to all data
- Manage users and roles
- Full moderation capabilities
- Access all audit logs
- Manage system assets

## Critical Security Recommendations

### 1. Never Select Password Column
The `password` column should NEVER be selected in any API response:

```typescript
// ❌ WRONG - Exposes password
const user = await db.user.findUnique({ where: { id: userId } });

// ✅ CORRECT - Excludes sensitive fields
const user = await db.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, name: true, role: true, createdAt: true }
});
```

When using Prisma, consider:
1. Creating a `select` type that excludes sensitive fields
2. Using Prisma's `omit()` for responses
3. Creating API response DTOs that don't include sensitive fields

### 2. API Response Filtering Strategy
Create a response transformer for user objects:

```typescript
export function sanitizeUser(user: User) {
  const { password, ...safeUser } = user;
  return safeUser;
}
```

### 3. Authentication Service Configuration
Ensure your authentication middleware:
- Never logs password fields
- Never includes passwords in error messages
- Uses secure password hashing (bcrypt with salt rounds ≥ 12)
- Implements rate limiting on login/reset endpoints

### 4. Session Security
- Sessions table should have appropriate TTL (via `expiresAt` field)
- Implement session invalidation on password changes
- Use secure tokens (random 32+ bytes)
- Store only hashed token in database (tokenHash)

### 5. Audit Logging
The `audit_logs` table tracks actions. Ensure:
- All privileged operations are logged
- Logs include: action type, actor, timestamp, and change details
- Logs are immutable (admins can only view, not modify)

## Implementation Checklist

- [ ] Run migration to enable RLS and create policies
- [ ] Test API endpoints with different user roles
- [ ] Verify password column is never selected/returned
- [ ] Update authentication middleware to sanitize responses
- [ ] Add audit logging for sensitive operations
- [ ] Test cross-role access restrictions
- [ ] Document API response schemas excluding sensitive fields
- [ ] Implement session expiration handling
- [ ] Add rate limiting to auth endpoints
- [ ] Set up monitoring for RLS policy violations

## Testing RLS Policies

### Manual Testing in Supabase Console
1. Enable "Request Body Editor" in Supabase console
2. Set `Authorization: Bearer <token>` header with different user tokens
3. Verify:
   - Users cannot access other users' data
   - Admins can access all data
   - Role-based restrictions work correctly
   - Insert/Update/Delete permissions are enforced

### API Testing
```bash
# Test as different users
curl -H "Authorization: Bearer $STUDENT_TOKEN" https://api/issues
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://api/issues
curl -H "Authorization: Bearer $MODERATOR_TOKEN" https://api/admin/users
```

## Troubleshooting

### "Policy violation" errors
- Verify the user's role in the `users` table
- Check that role values match exactly (case-sensitive)
- Ensure auth.uid() is properly configured

### Performance issues
- Add indexes on filtered columns used in policies
- Monitor policy execution time in database logs
- Consider caching for frequently accessed public data

### Policy updates
To modify existing policies:
```sql
ALTER POLICY policy_name ON table_name
  USING (new_condition)
  WITH CHECK (new_check_condition);
```

## References
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [PostgreSQL RLS Docs](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Security Linter Docs](https://supabase.com/docs/guides/database/database-linter)
