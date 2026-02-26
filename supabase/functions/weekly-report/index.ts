import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sender email from app_settings, fallback to default
    const { data: senderSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "report_sender_email")
      .maybeSingle();
    const senderEmail = senderSetting?.value || "reportes@bonovendedor.com";

    // Get active campaigns
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, name, start_date, end_date")
      .eq("is_active", true);

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No active campaigns" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load city groups
    const { data: cityGroups } = await supabase
      .from("city_groups")
      .select("id, name, display_order")
      .order("display_order");

    const { data: cityGroupMembers } = await supabase
      .from("city_group_members")
      .select("group_id, city_name");

    const groupsWithMembers = (cityGroups || []).map((g) => ({
      ...g,
      cities: (cityGroupMembers || []).filter((m) => m.group_id === g.id).map((m) => m.city_name),
    }));

    const results: any[] = [];
    const emailsSent: string[] = [];

    for (const campaign of campaigns) {
      // Get recipients for this campaign
      const { data: recipients } = await supabase
        .from("report_recipients")
        .select("email, city")
        .eq("campaign_id", campaign.id);

      if (!recipients || recipients.length === 0) continue;

      // Get ALL approved sales for this campaign
      const { data: allSales } = await supabase
        .from("sales")
        .select("week_start, week_end, bonus_bs, points, city, status")
        .eq("campaign_id", campaign.id)
        .eq("status", "approved");

      // --- Build weekly summary (all cities) ---
      const weekMap = new Map<string, { units: number; bonusBs: number }>();
      if (allSales) {
        for (const s of allSales) {
          const key = `${s.week_start}_${s.week_end}`;
          const existing = weekMap.get(key) || { units: 0, bonusBs: 0 };
          existing.units += 1;
          existing.bonusBs += Number(s.bonus_bs);
          weekMap.set(key, existing);
        }
      }

      const weeks = [...weekMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val], i) => {
          const [start, end] = key.split("_");
          return { weekNumber: i + 1, start, end, range: `Del ${formatDate(start)} al ${formatDate(end)}`, ...val };
        });

      // Add accumulation
      let accUnits = 0;
      let accBs = 0;
      const weeksWithAcc = weeks.map((w) => {
        accUnits += w.units;
        accBs += w.bonusBs;
        return { ...w, accUnits, accBs };
      });

      // --- Build city/group summary ---
      const citySummary: { name: string; units: number; bonusBs: number }[] = [];

      if (groupsWithMembers.length > 0) {
        // Use configured groups
        for (const group of groupsWithMembers) {
          const groupSales = (allSales || []).filter((s) => group.cities.includes(s.city));
          citySummary.push({
            name: group.name + (group.cities.length > 0 ? ` (${group.cities.join("/")})` : ""),
            units: groupSales.length,
            bonusBs: groupSales.reduce((sum, s) => sum + Number(s.bonus_bs), 0),
          });
        }
        // Add ungrouped cities
        const allGroupedCities = groupsWithMembers.flatMap((g) => g.cities);
        const ungroupedSales = (allSales || []).filter((s) => !allGroupedCities.includes(s.city));
        const ungroupedCities = [...new Set(ungroupedSales.map((s) => s.city))];
        for (const city of ungroupedCities) {
          const cs = ungroupedSales.filter((s) => s.city === city);
          citySummary.push({ name: city, units: cs.length, bonusBs: cs.reduce((sum, s) => sum + Number(s.bonus_bs), 0) });
        }
      } else {
        // No groups configured, use individual cities
        const cityMap = new Map<string, { units: number; bonusBs: number }>();
        for (const s of allSales || []) {
          const existing = cityMap.get(s.city) || { units: 0, bonusBs: 0 };
          existing.units += 1;
          existing.bonusBs += Number(s.bonus_bs);
          cityMap.set(s.city, existing);
        }
        for (const [city, val] of cityMap) {
          citySummary.push({ name: city, ...val });
        }
      }

      const totalUnits = citySummary.reduce((s, c) => s + c.units, 0);
      const totalBs = citySummary.reduce((s, c) => s + c.bonusBs, 0);

      const reportData = {
        campaign: campaign.name,
        weeks: weeksWithAcc,
        citySummary,
        totalUnits,
        totalBs,
      };

      results.push(reportData);

      // --- Send email via Resend ---
      if (RESEND_API_KEY) {
        const allEmails = [...new Set(recipients.map((r) => r.email))];

        // Build HTML table email
        const html = buildReportHtml(campaign.name, weeksWithAcc, citySummary, totalUnits, totalBs);

        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: senderEmail,
              to: allEmails,
              subject: `Reporte Semanal - ${campaign.name}`,
              html,
            }),
          });

          if (!resendRes.ok) {
            const errText = await resendRes.text();
            console.error("Resend error:", resendRes.status, errText);
          } else {
            emailsSent.push(...allEmails);
          }
        } catch (emailErr) {
          console.error("Email send error:", emailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reports_generated: results.length,
        emails_sent: emailsSent.length,
        reports: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("weekly-report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${parseInt(day)} de ${months[parseInt(m) - 1]}`;
}

function buildReportHtml(
  campaignName: string,
  weeks: { weekNumber: number; range: string; units: number; bonusBs: number; accUnits: number; accBs: number }[],
  citySummary: { name: string; units: number; bonusBs: number }[],
  totalUnits: number,
  totalBs: number
) {
  const weekRows = weeks
    .map(
      (w) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">Semana ${w.weekNumber}</td>
        <td style="padding:8px;border:1px solid #ddd;">${w.range}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${w.units}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">Bs ${w.bonusBs.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  const cityColors = ["#1B4332", "#2D6A4F", "#40916C", "#52B788", "#74C69D"];
  const cityRows = citySummary
    .map(
      (c, i) => `
      <tr style="background:${cityColors[i % cityColors.length]}15;">
        <td style="padding:8px;border:1px solid #ddd;border-left:4px solid ${cityColors[i % cityColors.length]};font-weight:600;">${c.name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">${c.units}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">Bs ${c.bonusBs.toLocaleString()}</td>
      </tr>`
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:Arial,sans-serif;background:#ffffff;padding:20px;">
    <div style="max-width:700px;margin:0 auto;">
      <h2 style="color:#1B4332;margin-bottom:4px;">Bono Vendedor SKYWORTH</h2>
      <p style="color:#666;margin-top:0;">${campaignName}</p>
      
      <h3 style="color:#2D6A4F;margin-top:24px;">Resumen por Semana</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1B4332;color:white;">
            <th style="padding:8px;text-align:left;">#</th>
            <th style="padding:8px;text-align:left;">Periodo</th>
            <th style="padding:8px;text-align:right;">Cantidad</th>
            <th style="padding:8px;text-align:right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${weekRows}
          <tr style="background:#1B4332;color:white;font-weight:bold;">
            <td colspan="2" style="padding:8px;">Total</td>
            <td style="padding:8px;text-align:right;">${totalUnits}</td>
            <td style="padding:8px;text-align:right;">Bs ${totalBs.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="color:#2D6A4F;margin-top:24px;">Resumen por Ciudad / Grupo</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#1B4332;color:white;">
            <th style="padding:8px;text-align:left;">Ciudad / Grupo</th>
            <th style="padding:8px;text-align:right;">Cantidad</th>
            <th style="padding:8px;text-align:right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${cityRows}
          <tr style="background:#1B4332;color:white;font-weight:bold;">
            <td style="padding:8px;">Total General</td>
            <td style="padding:8px;text-align:right;">${totalUnits}</td>
            <td style="padding:8px;text-align:right;">Bs ${totalBs.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <p style="color:#999;font-size:12px;margin-top:24px;">Reporte generado automáticamente · Bono Vendedor SKYWORTH</p>
    </div>
  </body>
  </html>`;
}
