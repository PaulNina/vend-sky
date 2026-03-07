import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string[];
  subject: string;
  html: string;
  from_name?: string;
  reply_to?: string;
}

interface EmailConfig {
  provider: "resend" | "smtp";
  resend_api_key?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from_email?: string;
  smtp_secure?: boolean;
}

async function getEmailConfig(adminClient: any): Promise<EmailConfig> {
  const keys = [
    "email_provider",
    "smtp_host",
    "smtp_port",
    "smtp_user",
    "smtp_password",
    "smtp_from_email",
    "smtp_secure",
  ];

  const { data: settings } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", keys);

  const map: Record<string, string> = {};
  for (const s of settings || []) {
    map[s.key] = s.value;
  }

  const provider = (map["email_provider"] || "resend") as "resend" | "smtp";

  return {
    provider,
    resend_api_key: Deno.env.get("RESEND_API_KEY") || undefined,
    smtp_host: map["smtp_host"] || undefined,
    smtp_port: parseInt(map["smtp_port"] || "587"),
    smtp_user: map["smtp_user"] || undefined,
    smtp_password: map["smtp_password"] || undefined,
    smtp_from_email: map["smtp_from_email"] || undefined,
    smtp_secure: map["smtp_secure"] === "true",
  };
}

async function sendViaResend(config: EmailConfig, email: EmailRequest): Promise<boolean> {
  if (!config.resend_api_key) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  const fromName = email.from_name || "Skyworth Bonos";
  const fromEmail = "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resend_api_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: email.to,
      subject: email.subject,
      html: email.html,
      ...(email.reply_to ? { reply_to: email.reply_to } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend error:", res.status, errText);
    return false;
  }
  return true;
}

async function sendViaSmtp(config: EmailConfig, email: EmailRequest): Promise<boolean> {
  if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
    console.error("SMTP config incomplete");
    return false;
  }

  const fromEmail = config.smtp_from_email || config.smtp_user;
  const fromName = email.from_name || "Skyworth Bonos";

  try {
    const client = new SMTPClient({
      connection: {
        hostname: config.smtp_host,
        port: config.smtp_port || 587,
        tls: config.smtp_secure ?? true,
        auth: {
          username: config.smtp_user,
          password: config.smtp_password,
        },
      },
    });

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: email.to.join(", "),
      subject: email.subject,
      content: "auto",
      html: email.html,
      ...(email.reply_to ? { replyTo: email.reply_to } : {}),
    });

    await client.close();
    return true;
  } catch (e) {
    console.error("SMTP send error:", e);
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

    const body: EmailRequest = await req.json();

    if (!body.to || body.to.length === 0 || !body.subject || !body.html) {
      return new Response(
        JSON.stringify({ error: "to, subject, and html are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = await getEmailConfig(adminClient);

    let sent = false;
    if (config.provider === "smtp") {
      sent = await sendViaSmtp(config, body);
    } else {
      sent = await sendViaResend(config, body);
    }

    return new Response(
      JSON.stringify({ success: sent, provider: config.provider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
