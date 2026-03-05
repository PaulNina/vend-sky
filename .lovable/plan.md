

## Plan: Campañas Parametrizables, Comisiones, QR y Notificaciones

### ✅ Phase 1: Database Schema + Campaign Date Validation (COMPLETED)
- Added QR columns to vendors, created commission_payments, notifications, email_templates tables
- Created storage buckets vendor-qr and payment-proofs (private)
- Updated RegisterSalePage with campaign date range validation

### ✅ Phase 2: Commissions / Payments Admin Page (COMPLETED)
- Created `/admin/comisiones` with filters, settlement generation, mark-as-paid, Excel export
- Created `generate-settlement` edge function
- Weekly breakdown toggle for REF-style view

### ✅ Phase 3: Vendor QR Upload + Admin QR View (COMPLETED)
- VendorProfilePage: QR upload section with 1-year expiry
- VendorsPage (admin): QR column with status and signed URL viewer
- CommissionsPage: QR quick-view for payment facilitation

### ✅ Phase 4: Payment Notification + Email Templates (COMPLETED)
- Created `notify-payment` edge function (in-app notification + email via Resend)
- Created `/admin/plantillas-email` for managing email templates
- Vendor notification bell with realtime updates in VendorLayout header
- Seeded default templates: PAYMENT_PAID_VENDOR, WEEKLY_CITY_REPORT
- Wired notify-payment from CommissionsPage on mark-as-paid

All 4 phases are now complete.
