import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, ShieldCheck, BarChart3, Tv, ChevronDown, Zap, Users, Star } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

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

const stats = [
  { value: "500+", label: "Vendedores activos" },
  { value: "10K+", label: "Ventas registradas" },
  { value: "Bs 250K+", label: "Bonos pagados" },
];

const steps = [
  { icon: Users, title: "Regístrate", desc: "Crea tu cuenta de vendedor en segundos" },
  { icon: Tv, title: "Registra ventas", desc: "Sube tus ventas con serial y foto" },
  { icon: Zap, title: "Validación instantánea", desc: "El sistema verifica automáticamente" },
  { icon: Star, title: "Gana bonos", desc: "Acumula puntos y recibe Bs semanales" },
];

const features = [
  { icon: Trophy, title: "Ranking en vivo", desc: "Compite con vendedores de todo el país y escala posiciones cada semana" },
  { icon: BarChart3, title: "Bonos semanales", desc: "Cada venta aprobada suma puntos que se convierten en Bs reales" },
  { icon: ShieldCheck, title: "Validación automática", desc: "Seriales verificados al instante contra la base de datos oficial" },
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  return (
    <div ref={containerRef} className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Header */}
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
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
      <motion.section
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative flex flex-col items-center justify-center px-6 py-20 md:py-32 text-center"
      >
        {/* Animated background accents */}
        <motion.div
          className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-primary/3 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative space-y-6 max-w-2xl">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30"
          >
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Tv className="h-4 w-4 text-primary" />
            </motion.div>
            <span className="text-sm font-medium text-primary">Campaña activa</span>
          </motion.div>

          <motion.h2
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="text-4xl md:text-6xl font-extrabold leading-tight font-display"
          >
            Gana bonos por cada{" "}
            <span className="text-primary relative">
              venta SKYWORTH
              <motion.span
                className="absolute -bottom-1 left-0 h-1 bg-primary/40 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
              />
            </span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
          >
            Registra tus ventas semanales, acumula puntos y recibe bonos en efectivo.
            ¡El Sueño del Hincha te premia por vender!
          </motion.p>
        </div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="flex flex-col sm:flex-row gap-4 mt-8"
        >
          <Button size="lg" className="text-base px-8 shadow-gold" asChild>
            <Link to="/register">
              <Zap className="h-5 w-5 mr-1" />
              Crear cuenta de vendedor
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Ya tengo cuenta</Link>
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-16"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="h-6 w-6 text-muted-foreground" />
        </motion.div>
      </motion.section>

      {/* Stats */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="px-6 py-16 border-y border-border bg-card/50"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              variants={scaleIn}
              custom={i}
              className="text-center space-y-1"
            >
              <p className="text-3xl md:text-4xl font-extrabold text-primary font-display">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Features */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="px-6 py-20"
      >
        <motion.h3
          variants={fadeUp}
          custom={0}
          className="text-2xl md:text-3xl font-bold text-center mb-12 font-display"
        >
          ¿Por qué usar <span className="text-primary">SKYWORTH Bono</span>?
        </motion.h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={scaleIn}
              custom={i}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group p-6 rounded-xl border border-border bg-card text-left space-y-3 cursor-default hover:border-primary/40 transition-colors"
            >
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-lg">{f.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* How it works */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="px-6 py-20 bg-card/30"
      >
        <motion.h3
          variants={fadeUp}
          custom={0}
          className="text-2xl md:text-3xl font-bold text-center mb-14 font-display"
        >
          Cómo funciona
        </motion.h3>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              variants={fadeUp}
              custom={i}
              className="relative text-center space-y-3"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="h-14 w-14 mx-auto rounded-full gradient-gold flex items-center justify-center shadow-gold"
              >
                <s.icon className="h-6 w-6 text-primary-foreground" />
              </motion.div>
              <div className="absolute top-7 left-[60%] w-[calc(100%-20px)] h-px bg-border hidden lg:block last:hidden" />
              <p className="text-xs font-bold text-primary font-display">Paso {i + 1}</p>
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
        viewport={{ once: true, margin: "-80px" }}
        className="px-6 py-20"
      >
        <motion.div
          variants={scaleIn}
          custom={0}
          className="max-w-2xl mx-auto text-center p-10 rounded-2xl border border-primary/30 bg-primary/5 space-y-6"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Trophy className="h-12 w-12 text-primary mx-auto" />
          </motion.div>
          <h3 className="text-2xl md:text-3xl font-bold font-display">
            ¿Listo para ganar?
          </h3>
          <p className="text-muted-foreground">
            Únete a cientos de vendedores que ya están acumulando bonos cada semana.
          </p>
          <Button size="lg" variant="premium" className="text-base px-10" asChild>
            <Link to="/register">Empezar ahora</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border p-6 text-center text-xs text-muted-foreground">
        © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
      </footer>
    </div>
  );
}
