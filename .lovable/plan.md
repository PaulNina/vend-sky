

## Plan: Fix vendor login — enable auto-confirm email signups

### Root cause

Email confirmation is enabled by default. When a new vendor registers via `signUp`:
1. The auth user is created but **email is not confirmed**
2. Without a confirmed session, `auth.uid()` returns null in RLS policies
3. The subsequent inserts to `vendors`, `user_roles`, and `user_profiles` **fail silently** because RLS denies them
4. When the vendor tries to log in, they have no roles → `RequireAuth` redirects them back to `/login` in an infinite loop

### Fix

**1. Enable auto-confirm email signups** using the `configure-auth` tool so that `signUp` immediately creates a valid, confirmed session. This allows all the RLS-protected inserts to succeed, and the vendor can access the app immediately after registration.

No code changes are needed — just a single auth configuration change.

