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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin using their JWT
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
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

    // Get target user email
    const { data: targetUser, error: getUserError } =
      await adminClient.auth.admin.getUserById(target_user_id);
    if (getUserError || !targetUser?.user) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetEmail = targetUser.user.email;

    if (mode === "send_link") {
      // Generate password recovery link
      const { data: linkData, error: linkError } =
        await adminClient.auth.admin.generateLink({
          type: "recovery",
          email: targetEmail!,
        });

      if (linkError) {
        return new Response(
          JSON.stringify({ error: linkError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Try sending via Resend if configured
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey && targetEmail) {
        const recoveryLink = linkData.properties?.action_link;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "SKYWORTH <noreply@skyworth.com>",
            to: [targetEmail],
            subject: "Restablecer contraseña - SKYWORTH",
            html: `<p>Hola,</p><p>Un administrador ha solicitado restablecer tu contraseña.</p><p><a href="${recoveryLink}">Haz clic aquí para crear una nueva contraseña</a></p><p>Si no solicitaste esto, ignora este correo.</p>`,
          }),
        });
      }

      // Audit log
      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "reset_password",
        target_user_id,
        details: { mode: "send_link", email: targetEmail },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Link de recuperación generado para ${targetEmail}`,
          action_link: linkData.properties?.action_link,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "set_temp_password") {
      // Generate a random temporary password
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
      let tempPassword = "";
      for (let i = 0; i < 12; i++) {
        tempPassword += chars[Math.floor(Math.random() * chars.length)];
      }

      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        target_user_id,
        { password: tempPassword }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Audit log
      await adminClient.from("admin_audit_logs").insert({
        admin_user_id: caller.id,
        action: "reset_password",
        target_user_id,
        details: { mode: "set_temp_password", email: targetEmail },
      });

      return new Response(
        JSON.stringify({
          success: true,
          temp_password: tempPassword,
          email: targetEmail,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "mode debe ser 'send_link' o 'set_temp_password'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
