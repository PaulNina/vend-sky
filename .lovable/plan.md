

## Plan: Campañas Parametrizables, Comisiones, QR y Notificaciones

This is a large feature set spanning database changes, new pages, edge functions, and storage. I'll break it into **4 phases** to implement incrementally.

---

### ✅ Phase 1: Database Schema + Campaign Date Validation (COMPLETED)

**Database migrations:** ✅
1. Added QR columns to `vendors` (qr_url, qr_uploaded_at, qr_expires_at)
2. Created `commission_payment_status` enum
3. Created `commission_payments` table with RLS
4. Created `notifications` table with RLS
5. Created `email_templates` table with RLS
6. Created storage buckets: `vendor-qr`, `payment-proofs` (private)

**Code change -- RegisterSalePage.tsx:** ✅
- Added `start_date`/`end_date` to Campaign interface and fetch
- Intersects week bounds with campaign date range for min/max on date input
- Validates sale date falls within campaign range on submit
- Shows clear error "La venta está fuera del periodo de campaña"

---

### Phase 2: Commissions / Payments Admin Page

**New page: `src/pages/admin/CommissionsPage.tsx`** at route `/admin/comisiones`

- **Filters bar**: Campaign selector (required), City (optional), Payment status (Pending/Paid/All), Period start/end date inputs, "Apply" button
- Period validation: warn and clamp if dates exceed campaign range
- **Main table** "A quién pagar y cuánto":
  - Vendor, City, Store, Approved Units, Commission Bs (formatted with thousands separator, no decimals), Status badge, Payment date, Proof link, QR indicator
  - Toggle "Show vendors with 0" (default off)
- **Actions**: "Mark as paid" (opens dialog to upload proof + note), "View QR" (signed URL modal), Export Excel
- **Optional weekly breakdown**: Toggle "Ver desglose semanal" shows sub-table with week number, date range, units, amount Bs, cumulative total
- Edge function `generate-settlement`: given campaign_id, period_start, period_end, optional city filter -- calculates approved sales, upserts `commission_payments` rows

**Add nav item** in `AdminLayout.tsx`: "Comisiones" with DollarSign icon

---

### Phase 3: Vendor QR Upload + Admin QR View

**VendorProfilePage.tsx** updates:
- New card section "Mi QR de Cobro"
- Upload QR image (jpg/png) to `vendor-qr` bucket
- Display current QR with status badge (Vigente/Vencido)
- Show expiry date, allow replacement
- On upload: set `qr_uploaded_at = now()`, `qr_expires_at = now + 1 year`

**VendorsPage.tsx** (admin kardex):
- Show QR column with status indicator and expiry date
- "Ver QR" button using signed URL

**CommissionsPage.tsx**:
- QR column with quick-view button for payment facilitation

---

### Phase 4: Payment Notification + Email Templates

**Edge function `notify-payment`:**
- Triggered when admin marks payment as paid
- Creates in-app notification in `notifications` table
- Sends email using `email_templates` row `PAYMENT_PAID_VENDOR`
- Uses RESEND_API_KEY (already configured)

**New page: `src/pages/admin/EmailTemplatesPage.tsx`** at `/admin/plantillas-email`:
- List/edit email templates (subject, body HTML, from_name, reply_to, active toggle)
- Seed default templates: `PAYMENT_PAID_VENDOR`, `WEEKLY_CITY_REPORT`

**Vendor notification bell:**
- Add notification indicator in VendorLayout header
- Dropdown showing recent notifications with read/unread state

---

### Implementation Order

1. ✅ **Phase 1** -- DB migrations + campaign date validation in RegisterSalePage (foundation)
2. **Phase 2** -- Commissions page + settlement edge function (core business value)
3. **Phase 3** -- QR upload for vendors + admin view
4. **Phase 4** -- Notifications + email templates
