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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller using getClaims
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden ejecutar esta acción" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { target_user_id, mode } = await req.json();

    if (!target_user_id || !mode) {
      return new Response(
        JSON.stringify({ error: "target_user_id y mode son requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (target_user_id === callerId) {
      return new Response(
        JSON.stringify({ error: "No puedes eliminarte a ti mismo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has critical history
    const { data: vendorRecord } = await adminClient
      .from("vendors")
      .select("id")
      .eq("user_id", target_user_id)
      .maybeSingle();

    let hasSalesHistory = false;
    if (vendorRecord) {
      const { count } = await adminClient
        .from("sales")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorRecord.id);
      hasSalesHistory = (count || 0) > 0;

      const { count: payCount } = await adminClient
        .from("commission_payments")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorRecord.id);
      if ((payCount || 0) > 0) hasSalesHistory = true;
    }

    const [reviewsResult, auditsResult] = await Promise.all([
      adminClient.from("reviews").select("id", { count: "exact", head: true }).eq("reviewer_user_id", target_user_id),
      adminClient.from("supervisor_audits").select("id", { count: "exact", head: true }).eq("supervisor_user_id", target_user_id),
    ]);

    const hasHistory =
      hasSalesHistory ||
      (reviewsResult.count || 0) > 0 ||
      (auditsResult.count || 0) > 0;

    if (mode === "check") {
      return new Response(
        JSON.stringify({ has_history: hasHistory }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "hard" && hasHistory) {
      return new Response(
        JSON.stringify({
          error: "Este usuario tiene historial (ventas, revisiones o auditoría). Solo se puede deshabilitar.",
          has_history: true,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "soft") {
      await adminClient
        .from("user_profiles")
        .update({ is_disabled: true, updated_at: new Date().toISOString() })
        .eq("user_id", target_user_id);

      if (vendorRecord) {
        await adminClient
          .from("vendors")
          .update({ is_active: false })
          .eq("id", vendorRecord.id);
      }

      await adminClient.auth.admin.updateUserById(target_user_id, {
        ban_duration: "876600h",
      });

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: callerId,
        action: "disable_user",
        target_user_id,
        details: { mode: "soft", has_history: hasHistory },
      });

      return new Response(
        JSON.stringify({ success: true, action: "disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "hard") {
      await adminClient.from("user_roles").delete().eq("user_id", target_user_id);
      await adminClient.from("user_profiles").delete().eq("user_id", target_user_id);

      if (vendorRecord) {
        await adminClient.from("vendors").delete().eq("id", vendorRecord.id);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(target_user_id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: callerId,
        action: "delete_user",
        target_user_id,
        details: { mode: "hard" },
      });

      return new Response(
        JSON.stringify({ success: true, action: "deleted" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "mode debe ser 'soft', 'hard' o 'check'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
