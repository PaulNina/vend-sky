import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VendorRow {
  full_name: string;
  email: string;
  phone?: string;
  city: string;
  store_name?: string;
  talla_polera?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin role required");

    const { vendors, campaign_id } = await req.json() as {
      vendors: VendorRow[];
      campaign_id?: string;
    };

    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      throw new Error("No vendors provided");
    }

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const v of vendors) {
      try {
        if (!v.full_name?.trim() || !v.email?.trim() || !v.city?.trim()) {
          errors.push(`${v.email || "sin email"}: datos incompletos`);
          skipped++;
          continue;
        }

        const email = v.email.trim().toLowerCase();

        // Check if user already exists
        const { data: existingUsers } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1,
        });

        // Try to find by email
        const { data: existingVendor } = await adminClient
          .from("vendors")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existingVendor) {
          errors.push(`${email}: vendedor ya existe`);
          skipped++;
          continue;
        }

        // Create auth user with random password
        const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
        });

        if (authError) {
          // User might exist in auth but not as vendor
          if (authError.message?.includes("already been registered")) {
            // Get existing auth user
            const { data: { users } } = await adminClient.auth.admin.listUsers();
            const existingAuth = users?.find((u: any) => u.email === email);
            if (existingAuth) {
              // Check if vendor record exists for this user
              const { data: existingVendorByUser } = await adminClient
                .from("vendors")
                .select("id")
                .eq("user_id", existingAuth.id)
                .maybeSingle();

              if (existingVendorByUser) {
                errors.push(`${email}: ya registrado como vendedor`);
                skipped++;
                continue;
              }

              // Create vendor record for existing auth user
              const { error: vendorErr } = await adminClient.from("vendors").insert({
                user_id: existingAuth.id,
                full_name: v.full_name.trim(),
                email,
                phone: v.phone?.trim() || null,
                city: v.city.trim(),
                store_name: v.store_name?.trim() || null,
                talla_polera: v.talla_polera?.trim() || null,
                is_active: true,
                pending_approval: false,
              });

              if (vendorErr) {
                errors.push(`${email}: ${vendorErr.message}`);
                skipped++;
                continue;
              }

              // Ensure vendor role
              await adminClient.from("user_roles").upsert(
                { user_id: existingAuth.id, role: "vendedor" },
                { onConflict: "user_id,role" }
              );

              // Ensure profile
              await adminClient.from("user_profiles").upsert(
                { user_id: existingAuth.id, email, full_name: v.full_name.trim() },
                { onConflict: "user_id" }
              );

              // Enroll in campaign if specified
              if (campaign_id) {
                const { data: existingVendorRecord } = await adminClient
                  .from("vendors")
                  .select("id")
                  .eq("user_id", existingAuth.id)
                  .single();
                if (existingVendorRecord) {
                  await adminClient.from("vendor_campaign_enrollments").upsert(
                    { vendor_id: existingVendorRecord.id, campaign_id, status: "active" },
                    { onConflict: "vendor_id,campaign_id" }
                  );
                }
              }

              created++;
              continue;
            }
          }
          errors.push(`${email}: ${authError.message}`);
          skipped++;
          continue;
        }

        const newUserId = authData.user!.id;

        // Create vendor record
        const { data: newVendor, error: vendorErr } = await adminClient.from("vendors").insert({
          user_id: newUserId,
          full_name: v.full_name.trim(),
          email,
          phone: v.phone?.trim() || null,
          city: v.city.trim(),
          store_name: v.store_name?.trim() || null,
          talla_polera: v.talla_polera?.trim() || null,
          is_active: true,
          pending_approval: false,
        }).select("id").single();

        if (vendorErr) {
          errors.push(`${email}: ${vendorErr.message}`);
          skipped++;
          continue;
        }

        // Create role
        await adminClient.from("user_roles").insert({
          user_id: newUserId,
          role: "vendedor",
        });

        // Create profile
        await adminClient.from("user_profiles").insert({
          user_id: newUserId,
          email,
          full_name: v.full_name.trim(),
        });

        // Enroll in campaign if specified
        if (campaign_id && newVendor) {
          await adminClient.from("vendor_campaign_enrollments").insert({
            vendor_id: newVendor.id,
            campaign_id,
            status: "active",
          });
        }

        created++;
      } catch (e: any) {
        errors.push(`${v.email || "desconocido"}: ${e.message}`);
        skipped++;
      }
    }

    return new Response(
      JSON.stringify({ created, skipped, errors: errors.slice(0, 50), total: vendors.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
