import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_path, week_start, week_end } = await req.json();

    if (!image_path || !week_start || !week_end) {
      return new Response(
        JSON.stringify({ error: "image_path, week_start, week_end required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create signed URL for the image
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from("sale-attachments")
      .createSignedUrl(image_path, 300);

    if (signedError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signedError);
      return new Response(
        JSON.stringify({ error: "No se pudo acceder a la imagen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Lovable AI with vision to extract dates
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente de OCR especializado en extraer fechas de documentos de venta bolivianos (notas de venta, pólizas, facturas). 
Analiza la imagen y extrae la fecha de venta/emisión del documento.
Responde ÚNICAMENTE con un JSON válido usando esta estructura exacta:
{"date_detected": "YYYY-MM-DD", "confidence": 0.95}
Si no puedes detectar ninguna fecha, responde: {"date_detected": null, "confidence": 0}
El campo confidence debe ser un número entre 0 y 1.
NO incluyas texto adicional, solo el JSON.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrae la fecha de venta/emisión de este documento. Solo devuelve el JSON.",
              },
              {
                type: "image_url",
                image_url: { url: signedData.signedUrl },
              },
            ],
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de solicitudes excedido, intente más tarde" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let dateDetected: string | null = null;
    let confidence = 0;

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        dateDetected = parsed.date_detected || null;
        confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0;
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
    }

    // Check if detected date falls within the given week
    let matchesWeek = false;
    if (dateDetected) {
      matchesWeek = dateDetected >= week_start && dateDetected <= week_end;
    }

    return new Response(
      JSON.stringify({
        date_detected: dateDetected,
        confidence: Math.round(confidence * 100) / 100,
        matches_week: matchesWeek,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("validate-sale-date error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
