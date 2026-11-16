"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
} from "lucide-react"

import camaron from "@/public/img/camaron.webp"
import { Button } from "@/components/ui/button"
import { PresupuestoForm } from "@/components/presupuesto-form"
import { SolicitudForm } from "@/components/solicitud-form"
import { cn } from "@/lib/utils"

type Modo = "inicio" | "ia" | "manual"
type Eleccion = Exclude<Modo, "inicio">

// Lo que dura la animación de la tarjeta elegida antes de cambiar de pantalla
const DURACION_ELECCION = 550

const OPCIONES = [
  {
    modo: "ia",
    Icono: SparklesIcon,
    etiqueta: "Recomendado",
    titulo: "Con ayuda de la IA",
    texto:
      "Cuéntanos tu proyecto con tus palabras. Nuestro asistente te propone los servicios, tú los revisas y obtienes el presupuesto en PDF.",
    pasos: ["Describe tu proyecto", "Revisa la propuesta", "Descarga el PDF"],
    accion: "Empezar con IA",
  },
  {
    modo: "manual",
    Icono: SlidersHorizontalIcon,
    etiqueta: "Rápido",
    titulo: "Configúrala tú",
    texto:
      "¿Ya sabes lo que quieres? Elige el tipo de web y los extras, y el servidor calcula el precio al instante.",
    pasos: ["Elige el tipo de web", "Añade extras", "Ve el total"],
    accion: "Configurar a mano",
  },
] as const

// El modo se guarda en la URL (#ia, #manual) para que el botón «atrás» del
// navegador vuelva al inicio y se pueda compartir el enlace.
function leerModo(): Modo {
  const hash = window.location.hash.slice(1)
  return hash === "ia" || hash === "manual" ? hash : "inicio"
}

const sinMovimiento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function Inicio() {
  const [modo, setModo] = useState<Modo>("inicio")
  // Tarjeta pulsada mientras se reproduce la animación de salida
  const [eligiendo, setEligiendo] = useState<Eleccion | null>(null)
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => {
    const sincronizar = () => {
      window.clearTimeout(temporizador.current)
      setEligiendo(null)
      setModo(leerModo())
    }
    sincronizar()
    window.addEventListener("popstate", sincronizar)
    return () => {
      window.removeEventListener("popstate", sincronizar)
      window.clearTimeout(temporizador.current)
    }
  }, [])

  function ir(nuevo: Modo) {
    const { pathname, search } = window.location
    history.pushState(
      null,
      "",
      nuevo === "inicio" ? pathname + search : `#${nuevo}`
    )
    setEligiendo(null)
    setModo(nuevo)
    window.scrollTo({ top: 0, behavior: sinMovimiento() ? "auto" : "smooth" })
  }

  // Primero se anima la tarjeta elegida (y se desvanece la otra); después se cambia de pantalla
  function elegir(opcion: Eleccion) {
    if (eligiendo) return
    if (sinMovimiento()) return ir(opcion)
    setEligiendo(opcion)
    temporizador.current = window.setTimeout(
      () => ir(opcion),
      DURACION_ELECCION
    )
  }

  if (modo === "inicio") {
    return (
      <div className="flex flex-1 flex-col items-center gap-10 py-6 sm:py-12">
        <div
          className={cn(
            "transition-all duration-500 ease-out",
            eligiendo && "-translate-y-4 opacity-0 blur-sm"
          )}
        >
          <Cabecera grande />
        </div>

        <div className="grid w-full max-w-5xl gap-6 pt-16 md:grid-cols-2 md:gap-8">
          {OPCIONES.map((o, i) => {
            const esIA = o.modo === "ia"
            const elegida = eligiendo === o.modo
            const descartada = eligiendo !== null && !elegida
            return (
              <div
                key={o.modo}
                className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both duration-700 ease-out"
                style={{ animationDelay: `${150 + i * 120}ms` }}
              >
                <button
                  type="button"
                  onClick={() => elegir(o.modo)}
                  disabled={eligiendo !== null}
                  aria-label={`${o.titulo}: ${o.accion}`}
                  className={cn(
                    "group relative isolate flex h-full w-full flex-col gap-5 overflow-visible rounded-2xl border bg-card p-6 text-left shadow-sm sm:p-8",
                    "transition-[transform,opacity,filter,box-shadow,border-color] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    !eligiendo &&
                      "hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-[0_20px_60px_-20px] hover:shadow-primary/40",
                    elegida &&
                      "scale-[1.04] border-primary shadow-[0_0_0_2px] shadow-primary ring-8 ring-primary/15",
                    descartada && "translate-y-6 scale-90 opacity-0 blur-sm"
                  )}
                >
                  {/* Brillo que sigue al hover */}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-radial-[at_30%_0%] from-primary/15 to-transparent to-70% opacity-0 transition-opacity duration-500 group-hover:opacity-100",
                      elegida && "opacity-100"
                    )}
                  />

                  {esIA && (
                    <Mascota
                      elegida={elegida}
                      className="absolute -top-16 right-2 w-28 sm:-top-20 sm:right-4 sm:w-36"
                    />
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={cn(
                        "flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground",
                        elegida &&
                          "scale-110 rotate-6 bg-primary text-primary-foreground"
                      )}
                    >
                      <o.Icono className="size-6" />
                    </span>
                    {!esIA && (
                      <span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">
                        {o.etiqueta}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex flex-col gap-2",
                      esIA && "pr-24 sm:pr-32"
                    )}
                  >
                    {esIA && (
                      <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {o.etiqueta}
                      </span>
                    )}
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {o.titulo}
                    </h2>
                    <p className="text-sm text-muted-foreground">{o.texto}</p>
                  </div>
                  <ol className="flex flex-col gap-2 text-sm">
                    {o.pasos.map((p, n) => (
                      <li key={p} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground transition-colors duration-300",
                            elegida &&
                              "border-primary bg-primary text-primary-foreground"
                          )}
                          style={{
                            transitionDelay: elegida ? `${n * 90}ms` : "0ms",
                          }}
                        >
                          {n + 1}
                        </span>
                        {p}
                      </li>
                    ))}
                  </ol>
                  <span className="mt-auto flex items-center gap-2 pt-2 font-medium text-primary">
                    {o.accion}
                    <ArrowRightIcon
                      className={cn(
                        "size-4 transition-transform duration-300 group-hover:translate-x-1",
                        elegida && "translate-x-3"
                      )}
                    />
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div
      key={modo}
      className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 ease-out"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => ir("inicio")}>
          <ArrowLeftIcon /> Volver al inicio
        </Button>
        <Cabecera />
        <Button
          variant="outline"
          onClick={() => ir(modo === "ia" ? "manual" : "ia")}
        >
          {modo === "ia" ? (
            <>
              <SlidersHorizontalIcon /> Prefiero configurarla yo
            </>
          ) : (
            <>
              <SparklesIcon /> Prefiero usar la IA
            </>
          )}
        </Button>
      </div>

      {modo === "ia" ? (
        <SolicitudForm />
      ) : (
        <section className="@container flex min-w-0 flex-col gap-4">
          <PresupuestoForm />
        </section>
      )}
    </div>
  )
}

// Mascota que representa al asistente de IA
function Mascota({
  elegida,
  className,
}: {
  elegida: boolean
  className?: string
}) {
  return (
    <span aria-hidden className={cn("pointer-events-none", className)}>
      <span
        className={cn(
          "block origin-bottom transition-transform duration-500 ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:-translate-y-2 group-hover:-rotate-3",
          elegida && "-translate-y-6 scale-110 -rotate-6"
        )}
      >
        <Image
          src={camaron}
          alt=""
          priority
          sizes="144px"
          className="h-auto w-full animate-[flotar_4s_ease-in-out_infinite] drop-shadow-[0_18px_24px_rgba(0,0,0,0.45)] motion-reduce:animate-none"
        />
      </span>
    </span>
  )
}

function Cabecera({ grande = false }: { grande?: boolean }) {
  if (!grande) {
    return (
      <p className="text-xl font-semibold tracking-tight">
        Presupuesta{" "}
        <span className="bg-linear-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
          mi web
        </span>
      </p>
    )
  }
  return (
    <header className="flex flex-col items-center gap-3 text-center animate-in fade-in slide-in-from-top-4 fill-mode-both duration-700">
      <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        Agencia web · Presupuestos al instante
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Presupuesta{" "}
        <span className="bg-linear-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
          mi web
        </span>
      </h1>
      <p className="max-w-2xl text-balance text-muted-foreground">
        Obtén un presupuesto desglosado para tu web. ¿Cómo quieres empezar?
      </p>
    </header>
  )
}
