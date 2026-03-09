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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Bolivia time: UTC-4
    const now = new Date();
    const boliviaNow = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const dayOfWeek = boliviaNow.getUTCDay(); // 0=Sun, 1=Mon...

    // This should run on Monday after 23:59 Bolivia time (Tuesday UTC ~03:59)
    // Close the PREVIOUS week's sales (Mon-Sun that just ended)
    // Previous week: go back to last Monday
    const lastMonday = new Date(boliviaNow);
    // If today is Monday (1), last Monday is 7 days ago
    // If today is Tuesday (2), last Monday is 8 days ago, but we want the week that ended Sunday
    const daysBack = dayOfWeek === 0 ? 6 : dayOfWeek === 1 ? 7 : dayOfWeek + 6;
    lastMonday.setUTCDate(boliviaNow.getUTCDate() - daysBack);
    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

    const weekStart = lastMonday.toISOString().split("T")[0];
    const weekEnd = lastSunday.toISOString().split("T")[0];

    // Close all pending AND observed sales for that week
    const { count, error } = await supabase
      .from("sales")
      .update({ status: "closed" })
      .in("status", ["pending", "observed"])
      .eq("week_start", weekStart)
      .eq("week_end", weekEnd)
      .select("id", { count: "exact", head: true });

    const closedCount = count || 0;

    return new Response(
      JSON.stringify({
        success: true,
        week_start: weekStart,
        week_end: weekEnd,
        closed_count: closedCount,
        executed_at: boliviaNow.toISOString(),
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
