import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LANDING_DEFAULTS, type LandingConfig } from "@/components/admin/LandingConfigSection";
import { Button } from "@/components/ui/button";
import { Trophy, UserCheck, Tv, Zap, DollarSign, PartyPopper, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import skyworthTv from "@/assets/skyworth-tv-hero.png";
import celebrationMoney from "@/assets/celebration-money.png";
import { Loader2 } from "lucide-react";
import { Confetti, FloatingCoins, fadeUp, scaleIn } from "@/components/landing/LandingAnimations";
import { toast } from "@/hooks/use-toast";

interface CampaignInfo {
  id: string;
  name: string;
  subtitle: string | null;
  slug: string;
  registration_enabled: boolean;
}

export default function CampaignLandingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null);
  const [cfg, setCfg] = useState<LandingConfig>({ ...LANDING_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showBurst, setShowBurst] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowBurst(true), 1000);

    (async () => {
      // Find campaign by slug
      const { data: camp } = await supabase
        .from("campaigns")
        .select("id, name, subtitle, slug, registration_enabled")
        .eq("slug", slug || "")
        .eq("is_active", true)
        .eq("status", "active")
        .maybeSingle();

      if (!camp) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCampaign(camp as CampaignInfo);

      // Load campaign-specific landing config
      const prefix = `landing_${camp.id}_`;
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .like("key", `${prefix}%`);

      if (settings && settings.length > 0) {
        const merged = { ...LANDING_DEFAULTS };
        for (const row of settings) {
          const baseKey = row.key.replace(prefix, "landing_");
          if (baseKey in merged) {
            (merged as any)[baseKey] = row.value;
          }
        }
        setCfg(merged);
      } else {
        // Fall back to global landing config
        const { data: globalSettings } = await supabase
          .from("app_settings")
          .select("key, value")
          .like("key", "landing_%");

        if (globalSettings && globalSettings.length > 0) {
          const merged = { ...LANDING_DEFAULTS };
          for (const row of globalSettings) {
            // Skip campaign-specific keys
            if (row.key.match(/^landing_[0-9a-f-]{36}_/)) continue;
            if (row.key in merged) {
              (merged as any)[row.key] = row.value;
            }
          }
          setCfg(merged);
        }
      }

      // Check enrollment status if user is logged in as vendor
      if (user && roles.includes("vendedor") && camp) {
        const { data: vendor } = await supabase
          .from("vendors")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (vendor) {
          setVendorId(vendor.id);
          const { data: enrollment } = await supabase
            .from("vendor_campaign_enrollments")
            .select("id")
            .eq("vendor_id", vendor.id)
            .eq("campaign_id", camp.id)
            .eq("status", "active")
            .maybeSingle();
          
          setIsEnrolled(!!enrollment);
        }
      }

      setLoading(false);
    })();

    return () => clearTimeout(timer);
  }, [slug, user, roles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold font-display">Campaña no encontrada</h1>
        <p className="text-muted-foreground">Esta campaña no existe o ya no está activa.</p>
        <Button asChild><Link to="/">Ir al inicio</Link></Button>
      </div>
    );
  }

  const handleEnroll = async () => {
    if (!vendorId || !campaign) return;
    setEnrolling(true);
    
    try {
      await supabase.from("vendor_campaign_enrollments").insert({
        vendor_id: vendorId,
        campaign_id: campaign.id,
        status: "active",
      });
      
      setIsEnrolled(true);
      toast({
        title: "¡Inscripción exitosa!",
        description: `Te has inscrito en ${campaign.name}. Ahora puedes registrar ventas.`,
      });
      
      // Redirect to dashboard after successful enrollment
      setTimeout(() => navigate("/v"), 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la inscripción.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const showConfetti = cfg.landing_show_confetti === "true";
  const registerUrl = `/register?campaign=${campaign?.id}`;
  const isVendor = user && roles.includes("vendedor");

  const steps = [
    { icon: Tv, title: cfg.landing_step1_title, desc: cfg.landing_step1_desc },
    { icon: UserCheck, title: cfg.landing_step2_title, desc: cfg.landing_step2_desc },
    { icon: DollarSign, title: cfg.landing_step3_title, desc: cfg.landing_step3_desc },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-md"
      >
        <div>
          <h1 className="text-xl font-bold text-primary font-display tracking-tight">SKYWORTH</h1>
          <p className="text-[10px] text-muted-foreground">{campaign?.name}{campaign?.subtitle ? ` · ${campaign.subtitle}` : ""}</p>
        </div>
        <div className="flex gap-3">
          {!user && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Ingresar</Link>
              </Button>
              {campaign?.registration_enabled && (
                <Button size="sm" asChild>
                  <Link to={registerUrl}>Crear cuenta</Link>
                </Button>
              )}
            </>
          )}
          {isVendor && isEnrolled && (
            <Button size="sm" variant="outline" asChild>
              <Link to="/v">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Ir al Panel
              </Link>
            </Button>
          )}
          {isVendor && !isEnrolled && (
            <Button size="sm" onClick={handleEnroll} disabled={enrolling}>
              {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Inscribirme
            </Button>
          )}
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative px-6 py-16 md:py-24 overflow-hidden">
        {showConfetti && <><Confetti /><FloatingCoins /></>}

        <motion.div
          className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-success/5 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-5 text-center md:text-left z-10">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30"
            >
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <PartyPopper className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">{cfg.landing_badge_text}</span>
            </motion.div>

            <motion.h2
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="text-3xl md:text-5xl font-extrabold leading-tight font-display"
            >
              {cfg.landing_headline}{" "}
              <span className="text-primary">{cfg.landing_highlight}</span>
              <br />
              <motion.span
                className="inline-block"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                ¡y gana dinero! 💰
              </motion.span>
            </motion.h2>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="text-base text-muted-foreground max-w-md"
            >
              {cfg.landing_description}
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="flex flex-col sm:flex-row gap-3"
            >
              {!user && campaign?.registration_enabled && (
                <Button size="lg" variant="premium" className="text-base" asChild>
                  <Link to={registerUrl}>
                    <Zap className="h-5 w-5 mr-1" />
                    {cfg.landing_cta_text}
                  </Link>
                </Button>
              )}
              {!user && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">{cfg.landing_cta_login_text}</Link>
                </Button>
              )}
              {isVendor && !isEnrolled && (
                <Button size="lg" variant="premium" className="text-base" onClick={handleEnroll} disabled={enrolling}>
                  {enrolling && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  <Zap className="h-5 w-5 mr-1" />
                  Inscribirme ahora
                </Button>
              )}
              {isVendor && isEnrolled && (
                <Button size="lg" variant="outline" asChild>
                  <Link to="/v">
                    <CheckCircle2 className="h-5 w-5 mr-1" />
                    Ir a mi Panel
                  </Link>
                </Button>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative flex justify-center z-10"
          >
            {showBurst && (
              <motion.img
                src={celebrationMoney}
                alt=""
                className="absolute inset-0 w-full h-full object-contain opacity-30 scale-125"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.3, scale: 1.25 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            )}
            <motion.img
              src={skyworthTv}
              alt="Televisor SKYWORTH"
              className="relative w-full max-w-sm drop-shadow-2xl z-10"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-primary/20"
              animate={{ scale: [0.8, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="px-6 py-14 border-y border-border bg-card/40"
      >
        <motion.h3
          variants={fadeUp} custom={0}
          className="text-xl md:text-2xl font-bold text-center mb-10 font-display"
        >
          🎉 Así de fácil ganas
        </motion.h3>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              custom={i}
              whileHover={{ y: -6, scale: 1.03, transition: { duration: 0.2 } }}
              className="group relative p-5 rounded-xl border border-border bg-card text-center space-y-3 hover:border-primary/40 transition-colors"
            >
              <span className="absolute -top-3 -right-3 text-xs font-bold bg-primary text-primary-foreground rounded-full h-7 w-7 flex items-center justify-center font-display shadow-gold">
                {i + 1}
              </span>
              <motion.div
                whileHover={{ rotate: 10 }}
                className="h-12 w-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
              >
                <s.icon className="h-6 w-6 text-primary" />
              </motion.div>
              <h4 className="font-semibold">{s.title}</h4>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="px-6 py-16"
      >
        <motion.div
          variants={scaleIn} custom={0}
          className="relative max-w-lg mx-auto text-center p-8 rounded-2xl border border-primary/30 bg-primary/5 space-y-5 overflow-hidden"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <div className="relative z-10 space-y-5">
            <motion.div
              animate={{ y: [0, -5, 0], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Trophy className="h-10 w-10 text-primary mx-auto" />
            </motion.div>
            <h3 className="text-xl md:text-2xl font-bold font-display">{cfg.landing_cta_final_title}</h3>
            <p className="text-sm text-muted-foreground">{cfg.landing_cta_final_desc}</p>
            {!user && campaign?.registration_enabled && (
              <Button size="lg" variant="premium" className="text-base px-8" asChild>
                <Link to={registerUrl}>{cfg.landing_cta_final_button}</Link>
              </Button>
            )}
            {isVendor && !isEnrolled && (
              <Button size="lg" variant="premium" className="text-base px-8" onClick={handleEnroll} disabled={enrolling}>
                {enrolling && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {cfg.landing_cta_final_button}
              </Button>
            )}
            {isVendor && isEnrolled && (
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <Link to="/v">Ver mi Panel</Link>
              </Button>
            )}
          </div>
        </motion.div>
      </motion.section>

      <footer className="border-t border-border p-5 text-center text-xs text-muted-foreground mt-auto">
        © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
      </footer>
    </div>
  );
}
