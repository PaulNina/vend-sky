

## Problem

The reset function currently only deletes **transactional data** (sales, reviews, commissions, etc.) and **resets** serials/campaigns to their default state. It does NOT delete master data like campaigns, products, serials, vendors, cities, etc. That's why after reset you still see 1 campaign, 10 products, 49 serials, 18 vendors, etc.

## Plan

### Update `reset-system` Edge Function

Modify the function to truly delete **ALL** data from every table, in proper FK dependency order:

1. **Delete children first** (same as now): commission_payments, supervisor_audits, reviews, sale_attachments, sales
2. **Delete serials** (instead of resetting to available)
3. **Delete enrollments, blocks, store history, notifications, audit logs, campaign_periods**
4. **Delete new tables**: restricted_serials, report_recipients, city_group_members, city_groups, cities
5. **Delete campaigns** (instead of resetting to active)
6. **Delete products**
7. **Delete vendors**
8. **Delete user_roles** and **user_profiles** (except the admin performing the reset)
9. **Optionally preserve**: app_settings and email_templates (system config), or delete them too

The key change: replace `update` calls for serials/campaigns with `deleteAllRows`, and add deletion of all master tables (products, vendors, cities, etc.).

### Update Reset Dialog text

Update the description in ConfigurationPage.tsx to reflect that this deletes ALL data, not just transactional data.

### Files to modify
- `supabase/functions/reset-system/index.ts` — delete all tables instead of just transactional ones
- `src/pages/admin/ConfigurationPage.tsx` — update dialog description

