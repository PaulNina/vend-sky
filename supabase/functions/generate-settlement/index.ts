import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller JWT explicitly (Lovable Cloud ES256)
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id, period_start, period_end, city, period_id } = await req.json();

    if (!campaign_id || !period_start || !period_end) {
      return new Response(
        JSON.stringify({ error: "campaign_id, period_start, period_end required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active vendors, optionally filtered by city
    let vendorsQuery = adminClient
      .from("vendors")
      .select("id, full_name, city, store_name")
      .eq("is_active", true);
    if (city) {
      vendorsQuery = vendorsQuery.eq("city", city);
    }
    const { data: vendors, error: vendorsError } = await vendorsQuery;
    if (vendorsError) throw vendorsError;

    // Get approved sales in the period for the campaign (batch to avoid 1000 row limit)
    const allSales: { vendor_id: string; bonus_bs: number }[] = [];
    const batchSize = 1000;
    let from = 0;
    while (true) {
      let q = adminClient
        .from("sales")
        .select("vendor_id, bonus_bs")
        .eq("campaign_id", campaign_id)
        .eq("status", "approved")
        .gte("sale_date", period_start)
        .lte("sale_date", period_end)
        .range(from, from + batchSize - 1);
      if (city) q = q.eq("city", city);
      const { data: batch, error: batchErr } = await q;
      if (batchErr) throw batchErr;
      if (!batch || batch.length === 0) break;
      allSales.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }
    const sales = allSales;

    // Aggregate per vendor
    const vendorMap: Record<string, { units: number; amount_bs: number }> = {};
    for (const sale of sales || []) {
      if (!vendorMap[sale.vendor_id]) {
        vendorMap[sale.vendor_id] = { units: 0, amount_bs: 0 };
      }
      vendorMap[sale.vendor_id].units += 1;
      vendorMap[sale.vendor_id].amount_bs += Number(sale.bonus_bs) || 0;
    }

    // Upsert commission_payments for each vendor
    let upserted = 0;
    let skipped = 0;

    for (const vendor of vendors || []) {
      const agg = vendorMap[vendor.id];
      if (!agg || agg.units === 0) { skipped++; continue; }

      // Check if already paid — don't overwrite
      const { data: existing } = await adminClient
        .from("commission_payments")
        .select("id, status")
        .eq("campaign_id", campaign_id)
        .eq("vendor_id", vendor.id)
        .eq("period_start", period_start)
        .eq("period_end", period_end)
        .maybeSingle();

      if (existing?.status === "paid") {
        skipped++;
        continue;
      }

      if (existing) {
        // Update existing pending record
        await adminClient
          .from("commission_payments")
          .update({ units: agg.units, amount_bs: Math.round(agg.amount_bs), ...(period_id ? { period_id } : {}) })
          .eq("id", existing.id);
      } else {
        // Insert new
        await adminClient.from("commission_payments").insert({
          campaign_id,
          vendor_id: vendor.id,
          period_start,
          period_end,
          units: agg.units,
          amount_bs: Math.round(agg.amount_bs),
          status: "pending",
          ...(period_id ? { period_id } : {}),
        });
      }
      upserted++;
    }

    return new Response(
      JSON.stringify({ success: true, upserted, skipped, total_vendors: vendors?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
