import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create campaigns
    const { data: campaigns } = await supabase.from('campaigns').insert([
      {
        name: 'El Sueño del Hincha',
        subtitle: 'Campaña principal temporada 2026',
        start_date: '2026-03-25',
        end_date: '2026-07-25',
        is_active: true,
        registration_enabled: true,
      },
      {
        name: 'Bono Vendedor El Sueño del Hincha',
        subtitle: 'Bono complementario por ventas',
        start_date: '2026-03-25',
        end_date: '2026-07-25',
        is_active: true,
        registration_enabled: true,
      },
    ]).select();

    // 2. Create products
    const products = [
      { model_code: 'E5500H-32', name: 'SKYWORTH E5500H 32"', size_inches: 32, points_value: 10, bonus_bs_value: 50 },
      { model_code: 'E5500H-40', name: 'SKYWORTH E5500H 40"', size_inches: 40, points_value: 15, bonus_bs_value: 80 },
      { model_code: 'E5500H-43', name: 'SKYWORTH E5500H 43"', size_inches: 43, points_value: 18, bonus_bs_value: 100 },
      { model_code: 'E6600H-50', name: 'SKYWORTH E6600H 50"', size_inches: 50, points_value: 25, bonus_bs_value: 150 },
      { model_code: 'E6600H-55', name: 'SKYWORTH E6600H 55"', size_inches: 55, points_value: 30, bonus_bs_value: 200 },
      { model_code: 'G6600H-55', name: 'SKYWORTH G6600H 55"', size_inches: 55, points_value: 35, bonus_bs_value: 250 },
      { model_code: 'G6600H-65', name: 'SKYWORTH G6600H 65"', size_inches: 65, points_value: 45, bonus_bs_value: 350 },
      { model_code: 'Q6600H-55', name: 'SKYWORTH Q6600H 55"', size_inches: 55, points_value: 40, bonus_bs_value: 300 },
      { model_code: 'Q6600H-65', name: 'SKYWORTH Q6600H 65"', size_inches: 65, points_value: 50, bonus_bs_value: 400 },
      { model_code: 'Q7500G-75', name: 'SKYWORTH Q7500G 75"', size_inches: 75, points_value: 70, bonus_bs_value: 600 },
    ];
    const { data: insertedProducts } = await supabase.from('products').insert(products).select();

    // 3. Create serials (5 per product = 50)
    if (insertedProducts) {
      const serials: { serial: string; product_id: string }[] = [];
      for (const product of insertedProducts) {
        for (let i = 1; i <= 5; i++) {
          serials.push({
            serial: `${product.model_code}-${String(i).padStart(4, '0')}`,
            product_id: product.id,
          });
        }
      }
      await supabase.from('serials').insert(serials);
    }

    // 4. Create restricted serials (examples)
    await supabase.from('restricted_serials').insert([
      { serial: 'E5500H-32-9999', reason: 'Usado en promo anterior', source_campaign: 'Promo Navidad 2025' },
      { serial: 'E6600H-50-9998', reason: 'Serial reportado como dañado', source_campaign: 'Promo Año Nuevo 2026' },
    ]);

    // 5. Create users (admin + vendors)
    const usersToCreate = [
      { email: 'admin@skyworth.bo', password: 'Admin123!', role: 'admin' as const, fullName: 'Administrador SKYWORTH', city: 'La Paz' },
      { email: 'revisor.lpz@skyworth.bo', password: 'Revisor123!', role: 'revisor_ciudad' as const, fullName: 'Carlos Mamani', city: 'La Paz' },
      { email: 'revisor.cbba@skyworth.bo', password: 'Revisor123!', role: 'revisor_ciudad' as const, fullName: 'Ana Flores', city: 'Cochabamba' },
      { email: 'revisor.scz@skyworth.bo', password: 'Revisor123!', role: 'revisor_ciudad' as const, fullName: 'Roberto Suárez', city: 'Santa Cruz' },
      { email: 'supervisor@skyworth.bo', password: 'Super123!', role: 'supervisor' as const, fullName: 'María Quispe', city: 'La Paz' },
    ];

    const vendorsData = [
      { email: 'vendedor1.lpz@skyworth.bo', fullName: 'Juan Pérez', city: 'La Paz', store: 'Tienda Central LP' },
      { email: 'vendedor2.lpz@skyworth.bo', fullName: 'Rosa Condori', city: 'La Paz', store: 'ElectroMax LP' },
      { email: 'vendedor3.lpz@skyworth.bo', fullName: 'Pedro Huanca', city: 'La Paz', store: 'TechStore LP' },
      { email: 'vendedor4.lpz@skyworth.bo', fullName: 'Lucía Apaza', city: 'La Paz', store: 'MegaElectro LP' },
      { email: 'vendedor5.lpz@skyworth.bo', fullName: 'Miguel Choque', city: 'La Paz', store: 'Digital House LP' },
      { email: 'vendedor1.cbba@skyworth.bo', fullName: 'Andrés Rojas', city: 'Cochabamba', store: 'ElectroCBBA' },
      { email: 'vendedor2.cbba@skyworth.bo', fullName: 'Carmen Torrez', city: 'Cochabamba', store: 'TechCenter CBBA' },
      { email: 'vendedor3.cbba@skyworth.bo', fullName: 'Fernando Vargas', city: 'Cochabamba', store: 'MegaStore CBBA' },
      { email: 'vendedor4.cbba@skyworth.bo', fullName: 'Silvia Guzmán', city: 'Cochabamba', store: 'Digital CBBA' },
      { email: 'vendedor5.cbba@skyworth.bo', fullName: 'Diego Montaño', city: 'Cochabamba', store: 'Electrónica CBBA' },
      { email: 'vendedor1.scz@skyworth.bo', fullName: 'Patricia Salvatierra', city: 'Santa Cruz', store: 'ElectroSCZ' },
      { email: 'vendedor2.scz@skyworth.bo', fullName: 'Mario Justiniano', city: 'Santa Cruz', store: 'TechPlaza SCZ' },
      { email: 'vendedor3.scz@skyworth.bo', fullName: 'Gabriela Suárez', city: 'Santa Cruz', store: 'MegaElectro SCZ' },
      { email: 'vendedor4.scz@skyworth.bo', fullName: 'Oscar Méndez', city: 'Santa Cruz', store: 'Digital House SCZ' },
      { email: 'vendedor5.scz@skyworth.bo', fullName: 'Natalia Cruz', city: 'Santa Cruz', store: 'TechStore SCZ' },
    ];

    // Create admin/revisor/supervisor users
    for (const u of usersToCreate) {
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (authUser?.user) {
        await supabase.from('user_roles').insert({ user_id: authUser.user.id, role: u.role, city: u.city });
        if (u.role === 'revisor_ciudad') {
          // Also create vendor record for city reference
        }
      }
    }

    // Create vendor users
    for (const v of vendorsData) {
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: v.email,
        password: 'Vendedor123!',
        email_confirm: true,
      });
      if (authUser?.user) {
        await supabase.from('user_roles').insert({ user_id: authUser.user.id, role: 'vendedor' });
        await supabase.from('vendors').insert({
          user_id: authUser.user.id,
          full_name: v.fullName,
          email: v.email,
          city: v.city,
          store_name: v.store,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Datos demo creados exitosamente',
      campaigns: campaigns?.length,
      products: insertedProducts?.length,
      users: usersToCreate.length + vendorsData.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
