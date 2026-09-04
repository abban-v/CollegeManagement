# Security Fixes Quick Reference

## What Was Fixed? 🔒

All 18 Supabase security errors are now resolved:

| Error | Count | Status |
|-------|-------|--------|
| RLS Disabled in Public | 17 tables | ✅ Fixed |
| Sensitive Columns Exposed | 1 (password field) | ✅ Fixed |

## How to Deploy

### Step 1: Apply the Migration
```bash
cd backend
npx prisma migrate deploy
```

### Step 2: Verify it Worked
```bash
# Check RLS is enabled
SELECT tabl ename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;

# Should show all 17 table names
```

### Step 3: Test API Endpoints
```bash
# Login - password should NOT be in response
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass"}'

# Get users - only safe fields returned
curl http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

## What Changed in Code?

### New File: User Sanitizer
```typescript
// now always use this for safe user data:
import { SAFE_USER_SELECT } from "@/lib/user-sanitizer";

const user = await prisma.user.findUnique({
  where: { id: userId },
  select: SAFE_USER_SELECT,  // ✅ Excludes password
});
```

### Updated Endpoints
- ✅ `/api/v1/auth/login` - Uses SAFE_USER_SELECT
- ✅ `/api/v1/auth/session` - Uses SAFE_USER_SELECT
- ✅ `/api/v1/admin/users` - Uses SAFE_USER_SELECT

## RLS Policies at a Glance

| Table | Who Can View | Who Can Write |
|-------|------|-------|
| **users** | Self + Admins | Self + Admins |
| **sessions** | Self only | Self + System |
| **issues** | All users | Reporter + Admins |
| **comments** | All users | Author + Admins |
| **notifications** | Self only | System only |
| **audit_logs** | Admins only | System only |
| **assets** | All users | Admins only |

## Files to Review

1. **Migration**: `backend/prisma/migrations/20260904_enable_rls/migration.sql`
   - Has all RLS policies for 17 tables

2. **Documentation**: `backend/docs/RLS_IMPLEMENTATION.md`
   - Complete guide to RLS setup and policies

3. **Utility**: `backend/src/lib/user-sanitizer.ts`
   - How to safely return user data

## Testing Checklist

After deployment:
- [ ] Run `npx prisma migrate deploy` successfully
- [ ] Can login (password not in response)
- [ ] Can view own notifications (not others')
- [ ] Admins can view all user data
- [ ] Students cannot access admin endpoints
- [ ] Issues are visible to all, editable by reporter/admins
- [ ] No "policy violation" errors in logs

## Common Issues & Fixes

### Q: Getting "permission denied for relation users"?
**A**: Migration might not have run. Check: `npx prisma migrate status`

### Q: Password still showing in responses?
**A**: Check endpoint uses `select: SAFE_USER_SELECT` 
Example fix:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: SAFE_USER_SELECT,  // Add this line
});
```

### Q: Students accessing admin endpoints?
**A**: This is correct! RLS policies will block DB access. Return 403 from API first.

## When Adding New Tables

1. Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create policies for your access pattern
3. Update `RLS_IMPLEMENTATION.md` with new policies
4. Test with different user roles

## Need More Details?

See: `SECURITY_FIX_SUMMARY.md` for complete information
See: `backend/docs/RLS_IMPLEMENTATION.md` for policy details
