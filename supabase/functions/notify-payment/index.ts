import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callSendEmail(supabaseUrl: string, serviceKey: string, payload: { to: string[]; subject: string; html: string; from_name?: string; reply_to?: string }): Promise<boolean> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.error("callSendEmail error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { commission_payment_id, vendor_id, vendor_name, vendor_email, campaign_name, period_start, period_end, amount_bs } = await req.json();

    if (!commission_payment_id || !vendor_id) {
      return new Response(JSON.stringify({ error: "commission_payment_id and vendor_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get vendor user_id for in-app notification
    const { data: vendor } = await adminClient
      .from("vendors")
      .select("user_id, email, full_name")
      .eq("id", vendor_id)
      .single();

    if (!vendor) {
      return new Response(JSON.stringify({ error: "Vendor not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = vendor_email || vendor.email;
    const recipientName = vendor_name || vendor.full_name;
    const amountFormatted = Math.round(amount_bs || 0).toLocaleString("es-BO");

    // 1. Create in-app notification
    await adminClient.from("notifications").insert({
      user_id: vendor.user_id,
      title: "¡Pago de comisiones realizado!",
      body: `Tu comisión de Bs ${amountFormatted} por la campaña "${campaign_name || ""}" (${period_start} a ${period_end}) ha sido pagada.`,
      type: "payment_paid",
      data: { commission_payment_id, campaign_name, period_start, period_end, amount_bs },
    });

    // 2. Send email via send-email function (Resend or SMTP based on config)
    let emailSent = false;
    if (recipientEmail) {
      // Fetch email template
      const { data: template } = await adminClient
        .from("email_templates")
        .select("subject, body_html, from_name, reply_to, is_active")
        .eq("key", "PAYMENT_PAID_VENDOR")
        .single();

      if (template?.is_active) {
        let subject = template.subject || "¡Tus comisiones fueron pagadas!";
        let bodyHtml = template.body_html || "";

        // Replace template variables
        const replacements: Record<string, string> = {
          "{{vendor_name}}": recipientName,
          "{{campaign_name}}": campaign_name || "",
          "{{period_start}}": period_start || "",
          "{{period_end}}": period_end || "",
          "{{amount_bs}}": amountFormatted,
        };

        for (const [key, value] of Object.entries(replacements)) {
          subject = subject.replaceAll(key, value);
          bodyHtml = bodyHtml.replaceAll(key, value);
        }

        // If no custom body, use default
        if (!bodyHtml.trim()) {
          bodyHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #c8a45a;">¡Golazo, ${recipientName}! ⚽</h2>
              <p>Tus comisiones de la campaña <strong>${campaign_name || ""}</strong> ya fueron pagadas.</p>
              <div style="background: #f9f5eb; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #666; margin: 0 0 5px;">Monto pagado</p>
                <p style="font-size: 28px; font-weight: bold; color: #c8a45a; margin: 0;">Bs ${amountFormatted}</p>
                <p style="color: #999; font-size: 12px; margin-top: 5px;">Periodo: ${period_start} a ${period_end}</p>
              </div>
              <p>Ingresa a tu panel para ver el detalle completo.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">— Equipo Skyworth</p>
            </div>
          `;
        }

        emailSent = await callSendEmail(supabaseUrl, serviceKey, {
          to: [recipientEmail],
          subject,
          html: bodyHtml,
          from_name: template.from_name || "Skyworth Bonos",
          ...(template.reply_to ? { reply_to: template.reply_to } : {}),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, notification_created: true, email_sent: emailSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
