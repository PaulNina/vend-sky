

## Plan: Periodicidad Configurable, Campaign Periods y System Runner (sin Cron)

This is a large structural change. I'll implement it in **3 phases** within this plan, to be executed sequentially.

---

### Phase 1: Database Schema Changes

**Migration 1 — Extend `campaigns` + new tables:**

1. Add to `campaigns`:
   - `status text not null default 'active'` (values: `draft`, `active`, `closed`)
   - `close_reason text null`
   - `closed_at timestamptz null`
   - `auto_periods_enabled boolean default true`
   - `period_mode text default 'WEEKLY'` (WEEKLY / BIWEEKLY / MONTHLY / CUSTOM_DAYS)
   - `custom_days int null`
   - `anchor_date date null`
   - `close_time_local text default '23:59'`
   - `report_on_close boolean default true`
   - `report_recipients_mode text default 'BY_CITY'`
   - `enforce_sales_within_campaign boolean default true`

   Set existing active campaigns: `status = 'active'` where `is_active = true`, `status = 'closed'` where `is_active = false`.

2. Create `campaign_periods` table:
   - `id uuid pk default gen_random_uuid()`
   - `campaign_id uuid not null` (FK campaigns)
   - `period_number int not null`
   - `period_start date not null`
   - `period_end date not null`
   - `status text not null default 'open'` (open / closed)
   - `closed_at timestamptz null`
   - `closed_by uuid null`
   - `settlement_generated_at timestamptz null`
   - `report_generated_at timestamptz null`
   - `report_sent_at timestamptz null`
   - Unique: `(campaign_id, period_number)`, `(campaign_id, period_start, period_end)`
   - RLS: admin full CRUD, authenticated read

3. Add `period_id uuid null` to `commission_payments` (FK campaign_periods)

**No tables deleted. Existing data preserved.**

---

### Phase 2: Edge Function `run-system-processes`

New edge function at `supabase/functions/run-system-processes/index.ts`:

- `verify_jwt = false` in config.toml (validate admin in code)
- Input: `{ campaign_id, force?: boolean }`
- Logic:
  1. Verify caller is admin (via auth header + `has_role`)
  2. Check campaign status is `active`
  3. Calculate Bolivia now (UTC-4)
  4. Find `campaign_periods` where `status = 'open'` AND `period_end + close_time_local < now`
  5. For each expired period:
     - Update status to `closed`, set `closed_at`, `closed_by`
     - Call generate-settlement logic inline (reuse same SQL pattern: query approved sales in period range, upsert commission_payments with `period_id`)
     - Set `settlement_generated_at`
     - If `report_on_close = true`: generate report HTML (reuse weekly-report pattern), send via Resend to recipients, set `report_generated_at` and `report_sent_at`
  6. Return summary of closed periods, settlements generated, emails sent

**Remove cron info from ConfigurationPage UI** (the "Tareas Programadas" card). Keep `weekly-close` and `weekly-report` functions as files but they won't be scheduled.

---

### Phase 3: UI Changes

#### A. ConfigurationPage.tsx — Major rewrite

Replace current page with campaign-centric configuration:

1. **Campaign selector** at the top (dropdown of all campaigns)
2. **Campaign Status card**: shows current status (Draft/Active/Closed) with "Close Campaign" button
3. **Period Configuration card**:
   - Period mode selector (Weekly / Biweekly / Monthly / Custom N days)
   - Custom days input (shown only for CUSTOM_DAYS)
   - Anchor date (defaults to campaign start_date)
   - Close time (defaults to 23:59)
   - Report on close toggle
   - "Save Configuration" button
   - "Generate Periods" button → calculates all periods between start_date and end_date based on mode, inserts into `campaign_periods`. If regenerating, keeps CLOSED periods, replaces OPEN ones.
4. **System Status panel**:
   - Current open period + dates
   - Next estimated close
   - Last closed period
   - Last settlement generated
   - Last report sent
5. **"Ejecutar Procesos del Sistema" button** → calls `run-system-processes` edge function
6. **Keep existing sections**: Cities, City Groups, Gemini API Key, Quick Links (remove Cron card)

#### B. CommissionsPage.tsx — Period-aware filters

- Add "Periodo" dropdown populated from `campaign_periods` for the selected campaign
- When a period is selected, auto-fill period_start/period_end from the period record
- Keep "Rango personalizado" option for manual date override
- When generating settlement, pass `period_id` to link commission_payments
- Update generate-settlement edge function to accept optional `period_id` and store it

#### C. CampaignsPage.tsx — Status management

- Show campaign `status` badge (Draft/Active/Closed) instead of just is_active
- Add status column in table
- In edit dialog: allow changing status (with confirmation for CLOSED)
- When status = CLOSED, set `closed_at` and `close_reason`

#### D. RegisterSalePage.tsx — Block on CLOSED campaign

- Fetch campaign `status` field
- If status === 'closed', show "Campaña cerrada" error and block form

#### E. Auto-trigger on admin page load

- In ConfigurationPage and CommissionsPage, add a `useEffect` that calls `run-system-processes` once per session (throttled via sessionStorage key like `system_run_<campaign_id>_<today>`) to auto-close expired periods when admin visits these pages.

---

### Implementation Order

All in one go:

1. Database migration (campaigns columns + campaign_periods table + commission_payments period_id)
2. Edge function `run-system-processes`
3. Update `generate-settlement` to accept `period_id`
4. Rewrite `ConfigurationPage.tsx`
5. Update `CommissionsPage.tsx` with period dropdown
6. Update `CampaignsPage.tsx` with status management
7. Update `RegisterSalePage.tsx` to check campaign status
8. Add auto-trigger useEffect in admin pages

### Files affected

- **New**: `supabase/functions/run-system-processes/index.ts`
- **New migration**: campaign_periods table, campaigns columns, commission_payments period_id
- **Edit**: `ConfigurationPage.tsx` (major rewrite)
- **Edit**: `CommissionsPage.tsx` (add period dropdown, pass period_id)
- **Edit**: `CampaignsPage.tsx` (status field)
- **Edit**: `RegisterSalePage.tsx` (check closed status)
- **Edit**: `generate-settlement/index.ts` (accept period_id)
- **Edit**: `supabase/config.toml` (add run-system-processes)

