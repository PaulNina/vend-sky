

## Analysis of Missing Features

After reviewing the entire codebase, here is what exists and what needs to be built:

### Already Complete
- Landing page, Register, Login, Reset Password
- Vendor portal: Dashboard, Register Sale, My Sales, Ranking, Profile
- Admin modules: Campaigns, Registration Requests, Vendors, Products, Serials, Restricted, Reviews, Audit, Email Recipients, Users/Roles, Dashboard
- Edge functions: weekly-close, weekly-report, seed-demo-data
- Guards, layouts, role-based routing
- Serial validation in real-time
- Weekly time rules in RegisterSalePage

### What's Missing

---

### 1. AI Date Validation Edge Function + Integration in RegisterSalePage

The campaign has a toggle `ai_date_validation` but no backend or frontend integration exists.

**Plan:**
- Create edge function `supabase/functions/validate-sale-date/index.ts` that:
  - Receives a sale attachment image (nota or poliza URL)
  - Calls Lovable AI (Gemini Flash) with vision to extract dates from the image
  - Returns `{ date_detected: string | null, confidence: number, matches_week: boolean }`
- Add columns to `sales` table: `ai_date_detected` (text, nullable), `ai_date_confidence` (numeric, nullable)
- In `RegisterSalePage.tsx`, after uploading nota/poliza:
  - Check if the selected campaign has `ai_date_validation = true`
  - If yes, call the edge function with the uploaded image
  - If date doesn't match current week, block submission with clear error message
  - Store AI results in the sale record
- Add `verify_jwt = false` for the new function in `config.toml`

---

### 2. Configuration Page (`/admin/configuracion`)

Currently a placeholder. Build a real settings page with:
- System-wide settings display (active campaign summary, current week info)
- Quick links to manage campaigns, products, serials
- Toggle for AI date validation per campaign (already exists in CampaignsPage but a summary view here)
- Storage bucket status
- Cron job status summary (weekly-close, weekly-report)

---

### 3. Metrics Page (`/admin/metricas`)

Currently a placeholder. Build with:
- Weekly breakdown table: week number, date range, units, Bs, accumulated
- City-level summary with vendor count, units, Bs
- Export to Excel button
- Campaign and period filters

---

### 4. RegisterSalePage - Vendor Blocking Check

The `VendorLayout` blocks the entire outlet when pending/inactive, but `RegisterSalePage` should also independently check:
- `pending_approval` or `!is_active` status and show an inline block message
- Campaign registration_enabled check (partially exists)

---

### 5. Sale Attachments Storage Bucket - Make Public for Image Viewing

The `sale-attachments` bucket is currently NOT public, but `getPublicUrl()` is used everywhere. Images will fail to load. Need to either:
- Make the bucket public via migration, OR
- Use signed URLs instead of public URLs

---

### 6. Weekly-Report Email Integration

The `weekly-report` edge function generates data but doesn't send emails. It needs Resend or similar integration. Since this requires an API key, we'll structure it to be ready and prompt the user.

---

### 7. config.toml Missing Function Entries

`weekly-close` and `weekly-report` are not in `config.toml`. Only `seed-demo-data` is listed. Need to add entries with `verify_jwt = false`.

---

## Implementation Plan (ordered by priority)

### Step 1: Database Migration
- Add `ai_date_detected` (text, nullable) and `ai_date_confidence` (numeric, nullable) columns to `sales` table
- Make `sale-attachments` bucket public so images display correctly

### Step 2: AI Date Validation Edge Function
- Create `supabase/functions/validate-sale-date/index.ts`
- Uses Lovable AI (Gemini Flash) with vision capability to extract dates from sale receipt images
- Returns detected date, confidence, and whether it matches the current week
- Update `config.toml` with all 4 edge functions

### Step 3: Update RegisterSalePage
- After image upload, if campaign.ai_date_validation is true, call validate-sale-date
- Show validation results (detected date, confidence)
- Block if date doesn't match current week
- Save AI results to sale record

### Step 4: Build Configuration Page
- System status overview
- Campaign summary cards
- Quick-action links
- Cron job info display

### Step 5: Build Metrics Page
- Weekly breakdown table with accumulations
- City summary with vendor counts
- Campaign/period filters
- Excel export

### Step 6: Fix config.toml
- Add entries for `weekly-close`, `weekly-report`, and `validate-sale-date` with `verify_jwt = false`

### Technical Notes
- AI integration uses Lovable AI Gateway (LOVABLE_API_KEY already configured)
- Model: `google/gemini-2.5-flash` for vision/OCR date extraction (cost-effective, supports images)
- The edge function will receive the image path from storage, generate a signed URL, and pass it to the AI model
- No new secrets needed; LOVABLE_API_KEY is already available

