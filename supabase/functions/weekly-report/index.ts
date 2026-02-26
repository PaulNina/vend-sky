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
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const results: any[] = [];

    for (const campaign of campaigns) {
      // Get recipients for this campaign
      const { data: recipients } = await supabase
        .from("report_recipients")
        .select("email, city")
        .eq("campaign_id", campaign.id);

      if (!recipients || recipients.length === 0) continue;

      // Get unique cities from recipients
      const cities = [...new Set(recipients.map((r) => r.city))];

      for (const city of cities) {
        // Get approved sales grouped by week for this city and campaign
        const { data: sales } = await supabase
          .from("sales")
          .select("week_start, week_end, bonus_bs, points, status")
          .eq("campaign_id", campaign.id)
          .eq("city", city)
          .eq("status", "approved");

        // Group by week
        const weekMap = new Map<string, { units: number; bonusBs: number; points: number }>();
        if (sales) {
          for (const s of sales) {
            const key = `${s.week_start}_${s.week_end}`;
            const existing = weekMap.get(key) || { units: 0, bonusBs: 0, points: 0 };
            existing.units += 1;
            existing.bonusBs += Number(s.bonus_bs);
            existing.points += s.points;
            weekMap.set(key, existing);
          }
        }

        // Sort weeks
        const weeks = [...weekMap.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val], i) => ({
            weekNumber: i + 1,
            range: key.replace("_", " al "),
            ...val,
          }));

        // Calculate accumulations
        let accUnits = 0;
        let accBs = 0;
        const weeksWithAcc = weeks.map((w) => {
          accUnits += w.units;
          accBs += w.bonusBs;
          return { ...w, accUnits, accBs };
        });

        const cityRecipients = recipients.filter((r) => r.city === city).map((r) => r.email);

        results.push({
          campaign: campaign.name,
          city,
          recipients: cityRecipients,
          weeks: weeksWithAcc,
          totalUnits: accUnits,
          totalBs: accBs,
        });
      }
    }

    // Note: Actual email sending requires an email service integration.
    // This function prepares the report data. Email sending can be added
    // when an email service (Resend, etc.) is configured.

    return new Response(
      JSON.stringify({
        success: true,
        reports_generated: results.length,
        reports: results,
        note: "Email sending pending integration. Report data generated successfully.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
