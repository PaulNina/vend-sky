

## Plan: Remove "Pending Approval" Flow

The user wants to eliminate the entire vendor approval gate. All registered vendors should get immediate access without admin review.

### Changes

**1. `src/components/guards/RequireAuth.tsx`**
- Remove the `roles.length === 0` block that shows "Cuenta pendiente de aprobación". Instead, if a user has no roles, redirect to `/login` (simple fallback).

**2. `src/layouts/VendorLayout.tsx`**
- Remove the `vendorStatus` state, the `pending_approval` query, and the `isPending` card block. Always render `<Outlet />`.

**3. `src/pages/RegisterPage.tsx`**
- Remove `requireApproval` logic. Always set `pending_approval: false` and `is_active: true` on vendor insert/update. Always insert the `vendedor` role immediately. Success message always says "¡Registro exitoso!" / "Tu cuenta ha sido creada exitosamente."

**4. `src/pages/RegisterSalePage.tsx`**
- Remove the `pending_approval` check that blocks vendor from registering sales (lines ~228-230). Keep only the `is_active` check.

**5. `src/pages/admin/AdminDashboardPage.tsx`**
- Remove `pendingApprovals` state, the query for `pending_approval: true`, and the badge showing "X solicitudes".

**6. `src/pages/admin/VendorsPage.tsx`**
- Remove `pending_approval` from the interface, export, stats counter, and badge display. Show only Active/Inactive.

**7. `src/pages/VendorProfilePage.tsx`**
- Remove `pending_approval` from the interface and query. Badge shows only Active/Inactive.

**8. `src/pages/admin/CampaignsPage.tsx`**
- Remove `require_vendor_approval` from the form interface, default values, and any UI toggle for it.

**9. `src/layouts/AdminLayout.tsx`**
- Remove the "Solicitudes" nav item (`/admin/solicitudes-registro`).

**10. `src/App.tsx`**
- Remove the route for `RegistrationRequestsPage` and its import.

**11. `src/pages/admin/RegistrationRequestsPage.tsx`**
- Delete the file (no longer needed).

