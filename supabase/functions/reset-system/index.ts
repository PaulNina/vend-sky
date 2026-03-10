import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: delete ALL rows from a table in batches (bypasses 1000-row limit)
async function deleteAllRows(
  client: any,
  table: string,
  pkColumn = "id"
): Promise<number> {
  let totalDeleted = 0;
  let hasMore = true;

  while (hasMore) {
    // Fetch a batch of IDs to delete
    const { data: rows, error: fetchErr } = await client
      .from(table)
      .select(pkColumn)
      .limit(1000);

    if (fetchErr) throw new Error(`Error fetching ${table}: ${fetchErr.message}`);
    if (!rows || rows.length === 0) {
      hasMore = false;
      break;
    }

    const ids = rows.map((r: any) => r[pkColumn]);
    const { error: delErr } = await client
      .from(table)
      .delete()
      .in(pkColumn, ids);

    if (delErr) throw new Error(`Error deleting ${table}: ${delErr.message}`);
    totalDeleted += ids.length;

    // If we got less than 1000, we're done
    if (rows.length < 1000) {
      hasMore = false;
    }
  }

  return totalDeleted;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin role required");

    const { confirm_text } = await req.json();
    if (confirm_text !== "RESET TOTAL") {
      throw new Error("Confirmation text does not match");
    }

    const deleted: Record<string, number> = {};

    // Order matters due to foreign keys — delete children first
    // 1. Commission payments
    deleted.commission_payments = await deleteAllRows(adminClient, "commission_payments");

    // 2. Supervisor audits
    deleted.supervisor_audits = await deleteAllRows(adminClient, "supervisor_audits");

    // 3. Reviews
    deleted.reviews = await deleteAllRows(adminClient, "reviews");

    // 4. Sale attachments
    deleted.sale_attachments = await deleteAllRows(adminClient, "sale_attachments");

    // 5. Sales
    deleted.sales = await deleteAllRows(adminClient, "sales");

    // 6. Reset serials to available (in batches)
    let serialsReset = 0;
    let moreSerials = true;
    while (moreSerials) {
      const { data: usedSerials } = await adminClient
        .from("serials")
        .select("id")
        .neq("status", "available")
        .limit(1000);

      if (!usedSerials || usedSerials.length === 0) {
        moreSerials = false;
        break;
      }

      const ids = usedSerials.map((s: any) => s.id);
      await adminClient
        .from("serials")
        .update({ status: "available", used_sale_id: null })
        .in("id", ids);

      serialsReset += ids.length;
      if (usedSerials.length < 1000) moreSerials = false;
    }
    deleted.serials_reset = serialsReset;

    // 7. Vendor campaign enrollments
    deleted.vendor_campaign_enrollments = await deleteAllRows(adminClient, "vendor_campaign_enrollments");

    // 8. Vendor blocks
    deleted.vendor_blocks = await deleteAllRows(adminClient, "vendor_blocks");

    // 9. Vendor store history
    deleted.vendor_store_history = await deleteAllRows(adminClient, "vendor_store_history");

    // 10. Notifications
    deleted.notifications = await deleteAllRows(adminClient, "notifications");

    // 11. Admin audit logs
    deleted.admin_audit_logs = await deleteAllRows(adminClient, "admin_audit_logs");

    // 12. Campaign periods
    deleted.campaign_periods = await deleteAllRows(adminClient, "campaign_periods");

    // 13. Reset campaigns to active
    let campaignsReset = 0;
    let moreCampaigns = true;
    while (moreCampaigns) {
      const { data: camps } = await adminClient
        .from("campaigns")
        .select("id")
        .limit(1000);

      if (!camps || camps.length === 0) {
        moreCampaigns = false;
        break;
      }

      const ids = camps.map((c: any) => c.id);
      await adminClient
        .from("campaigns")
        .update({
          status: "active",
          is_active: true,
          closed_at: null,
          close_reason: null,
        })
        .in("id", ids);

      campaignsReset += ids.length;
      if (camps.length < 1000) moreCampaigns = false;
    }
    deleted.campaigns_reset = campaignsReset;

    // Log the reset action
    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: user.id,
      target_user_id: user.id,
      action: "system_reset",
      details: { deleted, timestamp: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true, deleted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
