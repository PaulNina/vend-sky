

## Problem

Registration requires an active campaign to exist. If there are no campaigns, or if `registration_enabled` is false, or if date windows are set, the registration is blocked. The user wants registration to always be open by default, independent of campaigns.

## Plan

### 1. Update `RegisterPage.tsx` — Remove campaign dependency for registration

Change `useRegistrationStatus` so that:
- If no `campaignId` is in the URL, registration is **always allowed** (no campaign check needed). The vendor registers without being tied to a campaign.
- If a `campaignId` IS provided, check only `registration_enabled` and date windows on that specific campaign — but still allow the user to register as a vendor even if the campaign blocks enrollment (they just won't be auto-enrolled).
- Campaign enrollment becomes optional: if a campaign is found and open, auto-enroll; otherwise just create the vendor.

Key changes to `useRegistrationStatus`:
- When no `campaignId`: set `allowed = true` immediately, skip all campaign queries.
- When `campaignId` provided: fetch campaign info for display/enrollment but don't block registration itself. Only block enrollment in that campaign if registration is closed.

### 2. Update registration handler (`handleRegister`)

- Remove the campaign requirement. Always create the vendor with role `vendedor`.
- Campaign enrollment is only attempted if `campaignData` exists and the campaign allows it.
- Remove the dependency on `campaignData` for `needsApproval` — default to `false` (vendor is active immediately).

### Files to modify
- `src/pages/RegisterPage.tsx` — refactor `useRegistrationStatus` and `handleRegister`

