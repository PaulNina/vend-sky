import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Import order respects foreign key dependencies
const IMPORT_ORDER = [
  "app_settings",
  "email_templates",
  "campaigns",
  "products",
  "cities",
  "city_groups",
  "city_group_members",
  "campaign_periods",
  "serials",
  "report_recipients",
  "user_profiles",
  "user_roles",
  "vendors",
  "vendor_campaign_enrollments",
  "vendor_blocks",
  "vendor_store_history",
  "sales",
  "sale_attachments",
  "reviews",
  "supervisor_audits",
  "commission_payments",
  "notifications",
  "admin_audit_logs",
];

// Tables with composite/special primary keys
const PK_MAP: Record<string, string | string[]> = {
  app_settings: "key",
  user_profiles: "user_id",
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

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin role required");

    const { tables, mode } = (await req.json()) as {
      tables: Record<string, Record<string, any>[]>;
      mode: "upsert" | "replace";
    };

    if (!tables || typeof tables !== "object") {
      throw new Error("No tables provided");
    }

    const results: Record<string, { imported: number; error?: string }> = {};

    for (const tableKey of IMPORT_ORDER) {
      const rows = tables[tableKey];
      if (!rows || !Array.isArray(rows) || rows.length === 0) continue;

      try {
        // Clean rows: remove empty-only placeholder rows
        const cleanRows = rows.filter(
          (r) => !("sin_datos" in r || "(vacío)" in r)
        );
        if (cleanRows.length === 0) continue;

        if (mode === "replace") {
          // Delete all existing data first (be careful with FK order - we delete in reverse)
          await adminClient.from(tableKey as any).delete().neq(
            tableKey === "app_settings" ? "key" : "id",
            "___impossible___"
          );
        }

        // Upsert in batches of 500
        const BATCH = 500;
        let imported = 0;

        for (let i = 0; i < cleanRows.length; i += BATCH) {
          const batch = cleanRows.slice(i, i + BATCH);

          const pk = PK_MAP[tableKey] || "id";
          const onConflict = Array.isArray(pk) ? pk.join(",") : pk;

          const { error: upsertErr } = await adminClient
            .from(tableKey as any)
            .upsert(batch as any, { onConflict, ignoreDuplicates: false });

          if (upsertErr) {
            throw new Error(upsertErr.message);
          }
          imported += batch.length;
        }

        results[tableKey] = { imported };
      } catch (e: any) {
        results[tableKey] = { imported: 0, error: e.message };
      }
    }

    const totalImported = Object.values(results).reduce(
      (a, b) => a + b.imported,
      0
    );
    const errors = Object.entries(results)
      .filter(([, v]) => v.error)
      .map(([k, v]) => `${k}: ${v.error}`);

    return new Response(
      JSON.stringify({
        total_imported: totalImported,
        tables_processed: Object.keys(results).length,
        details: results,
        errors: errors.slice(0, 50),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
