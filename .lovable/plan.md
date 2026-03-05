

## Fix: Post-Registration Role Race Condition

**Problem**: When a vendor registers (without approval required), the `onAuthStateChange` SIGNED_IN event fires immediately after `signUp()`, triggering `handleSession` which fetches roles before the role row is inserted. This sets `roles=[]`, causing RequireAuth to show "Cuenta pendiente de aprobación". A refresh fixes it because by then the role exists in the DB.

**Root cause timeline**:
1. `signUp()` completes → `onAuthStateChange('SIGNED_IN')` fires immediately
2. `handleSession` runs, fetches roles → gets `[]` (role not inserted yet)
3. RegisterPage continues: inserts vendor, inserts role, calls `refreshRoles()`
4. `refreshRoles` sets `roles=['vendedor']` but may be overwritten if `handleSession` is still settling

**Fix (2 files)**:

### 1. `src/contexts/AuthContext.tsx`
- For `SIGNED_IN` events, defer `handleSession` with a short delay (~500ms) so registration code can finish inserting the role before roles are fetched.
- This is safe because the loading state remains `true` until `handleSession` completes.

### 2. `src/pages/RegisterPage.tsx`
- For the non-approval flow: after inserting the role and calling `refreshRoles()`, navigate directly to `/v` instead of showing a success screen with "Ir a Iniciar Sesión". This eliminates the extra navigation step where stale roles could cause issues.
- Keep the success screen only for the `requireApproval` flow (where the user is signed out anyway).

