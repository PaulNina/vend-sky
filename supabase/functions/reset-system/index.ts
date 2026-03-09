import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Order matters due to foreign keys
    // 1. Delete commission payments
    const { count: c1 } = await adminClient.from("commission_payments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.commission_payments = c1 || 0;

    // 2. Delete supervisor audits
    const { count: c2 } = await adminClient.from("supervisor_audits").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.supervisor_audits = c2 || 0;

    // 3. Delete reviews
    const { count: c3 } = await adminClient.from("reviews").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.reviews = c3 || 0;

    // 4. Delete sale attachments
    const { count: c4 } = await adminClient.from("sale_attachments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.sale_attachments = c4 || 0;

    // 5. Delete sales
    const { count: c5 } = await adminClient.from("sales").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.sales = c5 || 0;

    // 6. Reset serials to available
    const { count: c6 } = await adminClient.from("serials").update({ status: "available", used_sale_id: null }).neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.serials_reset = c6 || 0;

    // 7. Delete vendor campaign enrollments
    const { count: c7 } = await adminClient.from("vendor_campaign_enrollments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.vendor_campaign_enrollments = c7 || 0;

    // 8. Delete vendor blocks
    const { count: c8 } = await adminClient.from("vendor_blocks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.vendor_blocks = c8 || 0;

    // 9. Delete vendor store history
    const { count: c9 } = await adminClient.from("vendor_store_history").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.vendor_store_history = c9 || 0;

    // 10. Delete notifications
    const { count: c10 } = await adminClient.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.notifications = c10 || 0;

    // 11. Delete admin audit logs
    const { count: c11 } = await adminClient.from("admin_audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.admin_audit_logs = c11 || 0;

    // 12. Delete campaign periods
    const { count: c12 } = await adminClient.from("campaign_periods").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.campaign_periods = c12 || 0;

    // 13. Reset campaigns to draft
    const { count: c13 } = await adminClient.from("campaigns").update({
      status: "active",
      is_active: true,
      closed_at: null,
      close_reason: null,
    }).neq("id", "00000000-0000-0000-0000-000000000000");
    deleted.campaigns_reset = c13 || 0;

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
