

## Plan: Fix email display and edge function auth in Users & Roles

### Problem 1: No emails shown
The `user_profiles` table is empty (`[]`). The UI merges `user_roles` with `user_profiles` to get emails, but no existing users have a `user_profiles` row.

**Fix (two-pronged):**
1. **DB migration**: Backfill `user_profiles` from `vendors` table (which has `email`, `full_name`, `user_id` for all vendors). Also insert the admin user profile from their JWT email.
2. **UI fallback**: In `UsersRolesPage.tsx`, also query `vendors` table as a secondary source for email/name data when `user_profiles` is missing. This ensures emails show even if `user_profiles` isn't populated for some users.

### Problem 2: Edge functions return 401 "Invalid JWT"
Both `admin-reset-password` and `admin-delete-user` have `verify_jwt = true` in `config.toml` and use `callerClient.auth.getUser()` internally. The `verify_jwt = true` setting fails with ES256 JWTs from Lovable Cloud.

**Fix:**
- Set `verify_jwt = false` for both functions in `config.toml` (consistent with all other edge functions)
- Replace `callerClient.auth.getUser()` with `getClaims(token)` pattern (same as `run-system-processes` and `generate-settlement`)
- Extract `userId` from `claimsData.claims.sub` instead of `caller.id`

### Files to change

1. **New migration** -- `INSERT INTO user_profiles ... SELECT FROM vendors` to backfill existing users
2. **`src/pages/admin/UsersRolesPage.tsx`** -- Also fetch `vendors` table as fallback email source alongside `user_profiles`
3. **`supabase/config.toml`** -- Set `verify_jwt = false` for `admin-reset-password` and `admin-delete-user`
4. **`supabase/functions/admin-delete-user/index.ts`** -- Replace `getUser()` with `getClaims(token)` pattern
5. **`supabase/functions/admin-reset-password/index.ts`** -- Replace `getUser()` with `getClaims(token)` pattern

