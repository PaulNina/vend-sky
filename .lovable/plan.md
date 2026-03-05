

## Plan: Fix date restrictions and simplify System Status

Two problems identified:

### Problem 1: Date picker blocked in vendor sale registration

The `RegisterSalePage` hardcodes a "current week Mon-Sun" restriction (`getCurrentWeekBounds()` and `isWithinCurrentWeek()`). This ignores the campaign's period configuration. If the campaign uses a different periodicity (e.g., biweekly, monthly), or the current period's dates don't align with the Mon-Sun week, the calendar stays locked.

**Fix**: Replace the hardcoded week logic with the campaign's **current open period** from `campaign_periods`. The date picker should allow any date within the current open period (intersected with "up to today" to prevent future dates).

- Fetch `campaign_periods` for the selected campaign where `status = 'open'`, ordered by `period_number`
- Use the first open period's `period_start` and `period_end` as the allowed date range
- Remove `getCurrentWeekBounds()`, `isWithinCurrentWeek()`, and `getBoliviaWeek()` helper functions (they enforce old Mon-Sun logic)
- Keep the `week_start` / `week_end` fields in the sale insert (derive from the open period's dates instead of the old week calculation)
- If no open period exists, block registration with a message like "No hay periodo abierto para esta campaña"

### Problem 2: "Estado del Sistema" panel is confusing

The user expects periods to close automatically based on the configured periodicity, not via a manual button. The "Estado del Sistema" card with manual "Ejecutar Procesos del Sistema" button is unclear.

**Fix**: 
- Remove the "Estado del Sistema" card entirely as a separate section
- Keep the auto-trigger `useEffect` that runs `run-system-processes` silently on page load (this already auto-closes expired periods)
- Move the Bolivia time display and a small "Ejecutar manualmente" link/button into the "Periodicidad de Cierre / Liquidación" card as a secondary action, so it's available but not prominent
- The periods list already shows open/closed status, which is sufficient feedback

### Files to edit

1. **`src/pages/RegisterSalePage.tsx`** — Replace week-based date logic with period-based logic from `campaign_periods`
2. **`src/pages/admin/ConfigurationPage.tsx`** — Remove "Estado del Sistema" card, move manual trigger into periodicity card

