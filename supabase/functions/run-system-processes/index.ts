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
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller JWT explicitly (Lovable Cloud signing-keys / ES256)
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

    const { campaign_id, force } = await req.json();
    if (!campaign_id) {
      return new Response(
        JSON.stringify({ error: "campaign_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get campaign
    const { data: campaign, error: campErr } = await adminClient
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (campErr || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (campaign.status !== "active" && !force) {
      return new Response(
        JSON.stringify({ error: "Campaign is not active", status: campaign.status }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate Bolivia now (UTC-4)
    const nowUtc = new Date();
    const boliviaNow = new Date(nowUtc.getTime() - 4 * 60 * 60 * 1000);
    const boliviaDateStr = boliviaNow.toISOString().split("T")[0];
    const boliviaTimeStr = boliviaNow.toISOString().split("T")[1].substring(0, 5); // HH:MM

    const closeTime = campaign.close_time_local || "23:59";

    // Find OPEN periods whose period_end + close_time has passed
    const { data: openPeriods, error: periodsErr } = await adminClient
      .from("campaign_periods")
      .select("*")
      .eq("campaign_id", campaign_id)
      .eq("status", "open")
      .order("period_number", { ascending: true });

    if (periodsErr) throw periodsErr;

    let periodsClosed = 0;
    let settlementsGenerated = 0;

    for (const period of openPeriods || []) {
      // Check if this period should be closed
      const periodEndDate = period.period_end;
      const shouldClose =
        force ||
        boliviaDateStr > periodEndDate ||
        (boliviaDateStr === periodEndDate && boliviaTimeStr >= closeTime);

      if (!shouldClose) continue;

      // Close the period
      await adminClient
        .from("campaign_periods")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: userId,
        })
        .eq("id", period.id);

      periodsClosed++;

      // Generate settlement for this period
      const { data: vendors } = await adminClient
        .from("vendors")
        .select("id, full_name, city, store_name")
        .eq("is_active", true);

      const { data: sales } = await adminClient
        .from("sales")
        .select("vendor_id, bonus_bs")
        .eq("campaign_id", campaign_id)
        .eq("status", "approved")
        .gte("sale_date", period.period_start)
        .lte("sale_date", period.period_end);

      // Aggregate per vendor
      const vendorMap: Record<string, { units: number; amount_bs: number }> = {};
      for (const sale of sales || []) {
        if (!vendorMap[sale.vendor_id]) {
          vendorMap[sale.vendor_id] = { units: 0, amount_bs: 0 };
        }
        vendorMap[sale.vendor_id].units += 1;
        vendorMap[sale.vendor_id].amount_bs += Number(sale.bonus_bs) || 0;
      }

      // Upsert commission_payments
      for (const vendor of vendors || []) {
        const agg = vendorMap[vendor.id] || { units: 0, amount_bs: 0 };

        const { data: existing } = await adminClient
          .from("commission_payments")
          .select("id, status")
          .eq("campaign_id", campaign_id)
          .eq("vendor_id", vendor.id)
          .eq("period_start", period.period_start)
          .eq("period_end", period.period_end)
          .maybeSingle();

        if (existing?.status === "paid") continue;

        if (existing) {
          await adminClient
            .from("commission_payments")
            .update({
              units: agg.units,
              amount_bs: Math.round(agg.amount_bs),
              period_id: period.id,
            })
            .eq("id", existing.id);
        } else {
          await adminClient.from("commission_payments").insert({
            campaign_id,
            vendor_id: vendor.id,
            period_start: period.period_start,
            period_end: period.period_end,
            units: agg.units,
            amount_bs: Math.round(agg.amount_bs),
            status: "pending",
            period_id: period.id,
          });
        }
      }

      // Mark settlement generated
      await adminClient
        .from("campaign_periods")
        .update({ settlement_generated_at: new Date().toISOString() })
        .eq("id", period.id);

      settlementsGenerated++;

      // Send report if configured
      if (campaign.report_on_close) {
        try {
          // Get recipients
          const { data: recipients } = await adminClient
            .from("report_recipients")
            .select("email, city")
            .eq("campaign_id", campaign_id);

          if (recipients && recipients.length > 0) {
            // Build simple report
            const cityStats: Record<string, { units: number; bs: number }> = {};
            for (const sale of sales || []) {
              const vendor = (vendors || []).find((v) => v.id === sale.vendor_id);
              const city = vendor?.city || "Desconocida";
              if (!cityStats[city]) cityStats[city] = { units: 0, bs: 0 };
              cityStats[city].units += 1;
              cityStats[city].bs += Number(sale.bonus_bs) || 0;
            }

            const reportHtml = `
              <h2>Reporte de Periodo - ${campaign.name}</h2>
              <p>Periodo ${period.period_number}: ${period.period_start} a ${period.period_end}</p>
              <table border="1" cellpadding="5" style="border-collapse:collapse">
                <tr><th>Ciudad</th><th>Unidades</th><th>Bs</th></tr>
                ${Object.entries(cityStats).map(([city, s]) =>
                  `<tr><td>${city}</td><td>${s.units}</td><td>${Math.round(s.bs)}</td></tr>`
                ).join("")}
              </table>
            `;

            const emailSet = new Set(recipients.map((r) => r.email));
            const emails = Array.from(emailSet);

            if (emails.length > 0) {
              // Call send-email function (supports Resend or SMTP based on config)
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${serviceKey}`,
                  },
                  body: JSON.stringify({
                    to: emails,
                    subject: `Reporte Periodo ${period.period_number} - ${campaign.name}`,
                    html: reportHtml,
                    from_name: "VendSky",
                  }),
                });
              } catch (emailErr) {
                console.error("send-email call error:", emailErr);
              }

              await adminClient
                .from("campaign_periods")
                .update({
                  report_generated_at: new Date().toISOString(),
                  report_sent_at: new Date().toISOString(),
                })
                .eq("id", period.id);
            }
          }
        } catch (reportErr) {
          console.error("Report send error:", reportErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        periods_closed: periodsClosed,
        settlements_generated: settlementsGenerated,
        bolivia_now: boliviaNow.toISOString(),
        total_open_periods: (openPeriods || []).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
