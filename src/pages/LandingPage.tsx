import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, UserCheck, Tv, Zap, DollarSign, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import skyworthTv from "@/assets/skyworth-tv-hero.png";
import celebrationMoney from "@/assets/celebration-money.png";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LANDING_DEFAULTS, type LandingConfig } from "@/components/admin/LandingConfigSection";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

/* Confetti particles */
function Confetti() {
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 4,
      size: 6 + Math.random() * 10,
      color: ["hsl(43,96%,56%)", "hsl(35,100%,62%)", "hsl(152,60%,42%)", "hsl(0,72%,51%)", "hsl(210,40%,96%)"][
        Math.floor(Math.random() * 5)
      ],
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 0.6, backgroundColor: p.color, top: -20 }}
          animate={{ y: [0, 800], x: [0, (Math.random() - 0.5) * 100], rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)], opacity: [1, 1, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </div>
  );
}

/* Floating coins */
function FloatingCoins() {
  const coins = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: 10 + Math.random() * 80,
    delay: Math.random() * 3,
    duration: 2.5 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {coins.map((c) => (
        <motion.div
          key={c.id}
          className="absolute text-primary"
          style={{ left: `${c.left}%`, bottom: -30 }}
          animate={{ y: [0, -600], opacity: [0, 1, 1, 0], scale: [0.5, 1, 0.8] }}
          transition={{ duration: c.duration, delay: c.delay, repeat: Infinity, ease: "easeOut" }}
        >
          <DollarSign className="h-5 w-5" />
        </motion.div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const [cfg, setCfg] = useState<LandingConfig>({ ...LANDING_DEFAULTS });
  const [showBurst, setShowBurst] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowBurst(true), 1000);
    // Load config from DB
    supabase
      .from("app_settings")
      .select("key, value")
      .like("key", "landing_%")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const merged = { ...LANDING_DEFAULTS };
          for (const row of data) {
            if (row.key in merged) {
              (merged as any)[row.key] = row.value;
            }
          }
          setCfg(merged);
        }
      });
    return () => clearTimeout(timer);
  }, []);

  const showConfetti = cfg.landing_show_confetti === "true";

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
          <p className="text-[10px] text-muted-foreground">Bono Vendedor · El Sueño del Hincha</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link to="/login">Ingresar</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/register">Crear cuenta</Link>
          </Button>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative px-6 py-16 md:py-24 overflow-hidden">
        {showConfetti && <><Confetti /><FloatingCoins /></>}

        {/* Glow effects */}
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
          {/* Text */}
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
              <Button size="lg" variant="premium" className="text-base" asChild>
                <Link to="/register">
                  <Zap className="h-5 w-5 mr-1" />
                  {cfg.landing_cta_text}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">{cfg.landing_cta_login_text}</Link>
              </Button>
            </motion.div>
          </div>

          {/* TV + celebration */}
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
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-primary/20"
              animate={{ scale: [0.8, 1.3], opacity: [0.5, 0] }}
              transition={{ duration: 2, delay: 1, repeat: Infinity, ease: "easeOut" }}
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
            <Button size="lg" variant="premium" className="text-base px-8" asChild>
              <Link to="/register">{cfg.landing_cta_final_button}</Link>
            </Button>
          </div>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border p-5 text-center text-xs text-muted-foreground mt-auto">
        © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
      </footer>
    </div>
  );
}
