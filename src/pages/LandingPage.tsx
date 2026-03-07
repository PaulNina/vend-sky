import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Trophy, UserCheck, BarChart3, Tv, Zap } from "lucide-react";
import { motion } from "framer-motion";
import skyworthTv from "@/assets/skyworth-tv-hero.png";

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

const features = [
  { icon: Tv, title: "Registra tu venta", desc: "Sube el serial del TV SKYWORTH vendido" },
  { icon: UserCheck, title: "Un operador valida", desc: "Tu venta es revisada y aprobada" },
  { icon: Trophy, title: "Gana tu bono", desc: "Acumula puntos y recibe Bs cada semana" },
];

export default function LandingPage() {
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

      {/* Hero with TV image */}
      <section className="relative px-6 py-16 md:py-24">
        {/* Glow effects */}
        <motion.div
          className="absolute top-20 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-primary/3 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <div className="space-y-6 text-center md:text-left">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30"
            >
              <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <Zap className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-sm font-medium text-primary">Campaña activa</span>
            </motion.div>

            <motion.h2
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="text-3xl md:text-5xl font-extrabold leading-tight font-display"
            >
              Vendé TVs{" "}
              <span className="text-primary">SKYWORTH</span>
              <br />y ganá bonos en Bs
            </motion.h2>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="text-base text-muted-foreground max-w-md"
            >
              Registra cada venta, un operador la valida y acumulás puntos que se convierten en efectivo cada semana.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="flex flex-col sm:flex-row gap-3"
            >
              <Button size="lg" className="shadow-gold" asChild>
                <Link to="/register">
                  <Zap className="h-5 w-5 mr-1" />
                  Crear cuenta
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Ya tengo cuenta</Link>
              </Button>
            </motion.div>
          </div>

          {/* TV Image */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex justify-center"
          >
            <motion.img
              src={skyworthTv}
              alt="Televisor SKYWORTH"
              className="w-full max-w-md drop-shadow-2xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>
      </section>

      {/* How it works - compact */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="px-6 py-16 border-y border-border bg-card/40"
      >
        <motion.h3
          variants={fadeUp} custom={0}
          className="text-xl md:text-2xl font-bold text-center mb-10 font-display"
        >
          Así de fácil funciona
        </motion.h3>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={scaleIn}
              custom={i}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative p-5 rounded-xl border border-border bg-card text-center space-y-3 hover:border-primary/40 transition-colors"
            >
              <div className="relative mx-auto">
                <span className="absolute -top-2 -left-2 text-4xl font-extrabold text-primary/10 font-display">{i + 1}</span>
                <div className="h-12 w-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h4 className="font-semibold">{f.title}</h4>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
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
          className="max-w-lg mx-auto text-center p-8 rounded-2xl border border-primary/30 bg-primary/5 space-y-5"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <BarChart3 className="h-10 w-10 text-primary mx-auto" />
          </motion.div>
          <h3 className="text-xl md:text-2xl font-bold font-display">¿Listo para ganar?</h3>
          <p className="text-sm text-muted-foreground">Cada TV SKYWORTH que vendés te acerca a tu próximo bono.</p>
          <Button size="lg" variant="premium" asChild>
            <Link to="/register">Empezar ahora</Link>
          </Button>
        </motion.div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border p-5 text-center text-xs text-muted-foreground mt-auto">
        © 2026 SKYWORTH Bolivia. Todos los derechos reservados.
      </footer>
    </div>
  );
}
