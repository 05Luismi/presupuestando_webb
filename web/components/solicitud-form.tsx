"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import {
  AlertCircleIcon,
  CircleHelpIcon,
  ClipboardListIcon,
  FileTextIcon,
  InfoIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  RevisionPropuesta,
  type PresupuestoCalculado,
  type ServicioPropuesto,
} from "@/components/revision-propuesta"
import { DocumentoPresupuesto } from "@/components/documento-presupuesto"
import { cn } from "@/lib/utils"
import camaron from "@/public/img/camaron.webp"

const euros = (n: number) =>
  n.toLocaleString("es-ES", { useGrouping: "always" }) + " €"

type Limites = {
  clienteMin: number
  clienteMax: number
  descripcionMin: number
  descripcionMax: number
}

type Solicitud = { cliente: string; descripcion: string }

type Propuesta = {
  resumen: string
  servicios: ServicioPropuesto[]
  dudas: string[]
  pendientes: string[]
}

type Resultado =
  | { ok: true; cliente: string; propuesta: Propuesta; avisos: string[] }
  | { ok: false; status: number; error: string; detalles: string[] }

// Valores de reserva mientras llegan los del servidor (que es quien manda)
const LIMITES_POR_DEFECTO: Limites = {
  clienteMin: 2,
  clienteMax: 100,
  descripcionMin: 20,
  descripcionMax: 2000,
}

// Datos ficticios para probar la aplicación
const EJEMPLOS: (Solicitud & { etiqueta: string })[] = [
  {
    etiqueta: "Restaurante",
    cliente: "Restaurante La Brasa Imaginaria",
    descripcion:
      "Necesito una web para un restaurante. Quiero mostrar la carta, tener un formulario para solicitar reservas y ofrecer el contenido en dos idiomas.",
  },
  {
    etiqueta: "Fisioterapia",
    cliente: "Fisio Ejemplo S.L.",
    descripcion:
      "Somos una clínica de fisioterapia pequeña. Queremos una página sencilla que presente nuestros tratamientos y un formulario para pedir cita.",
  },
  {
    etiqueta: "Tienda online",
    cliente: "Cerámicas Ficticias",
    descripcion:
      "Hacemos cerámica artesanal y queremos vender online con pago con tarjeta, además de un blog y una página sobre el taller.",
  },
]

export function SolicitudForm() {
  const [limites, setLimites] = useState<Limites>(LIMITES_POR_DEFECTO)
  const [cliente, setCliente] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [presupuesto, setPresupuesto] = useState<PresupuestoCalculado | null>(
    null
  )
  // Lo que la IA va escribiendo mientras llega la respuesta (streaming)
  const [enCurso, setEnCurso] = useState<{
    resumen: string
    servicios: string[]
  } | null>(null)

  useEffect(() => {
    fetch("/api/solicitud/limites")
      .then((r) => r.json())
      .then((d: Limites) => setLimites(d))
      .catch(() => {})
  }, [])

  const longitud = descripcion.trim().length
  const excedido = longitud > limites.descripcionMax

  function usarEjemplo(ejemplo: Solicitud) {
    setCliente(ejemplo.cliente)
    setDescripcion(ejemplo.descripcion)
    setResultado(null)
    setPresupuesto(null)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true)
    setResultado(null)
    setPresupuesto(null)
    setEnCurso({ resumen: "", servicios: [] })
    try {
      // Route Handler de Next (app/api/ia/propuesta/route.ts): responde en streaming
      const res = await fetch("/api/ia/propuesta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cliente, descripcion }),
      })

      // Errores antes de empezar (400, 403, 429, 502, 503): JSON normal
      if (!res.ok || !res.body) {
        const datos = await res.json().catch(() => ({}))
        setResultado({
          ok: false,
          status: res.status,
          error: datos.error ?? `Error ${res.status}`,
          detalles: datos.detalles ?? [],
        })
        return
      }

      // Lectura del flujo NDJSON: un evento JSON por línea
      const lector = res.body.pipeThrough(new TextDecoderStream()).getReader()
      let pendiente = ""
      let terminado = false
      while (!terminado) {
        const { value, done } = await lector.read()
        if (done) break
        pendiente += value
        const lineas = pendiente.split("\n")
        pendiente = lineas.pop() ?? ""
        for (const linea of lineas.filter(Boolean)) {
          const evento = JSON.parse(linea)
          if (evento.tipo === "resumen") {
            setEnCurso((p) => p && { ...p, resumen: p.resumen + evento.texto })
          } else if (evento.tipo === "servicio") {
            setEnCurso(
              (p) => p && { ...p, servicios: [...p.servicios, evento.nombre] }
            )
          } else if (evento.tipo === "fin") {
            setResultado({
              ok: true,
              cliente: evento.cliente,
              propuesta: evento.propuesta,
              avisos: evento.avisos ?? [],
            })
            terminado = true
          } else if (evento.tipo === "error") {
            setResultado({
              ok: false,
              status: 502,
              error: evento.error,
              detalles: evento.detalles ?? [],
            })
            terminado = true
          }
        }
      }
      if (!terminado) {
        setResultado({
          ok: false,
          status: 0,
          error: "La conexión se cortó antes de terminar.",
          detalles: ["Inténtalo de nuevo."],
        })
      }
    } catch {
      setResultado({
        ok: false,
        status: 0,
        error: "No se pudo conectar con el servidor.",
        detalles: ["Comprueba que la aplicación está arrancada (npm start)."],
      })
    } finally {
      setCargando(false)
      setEnCurso(null)
    }
  }

  const propuesta = resultado?.ok ? resultado : null

  // Tres pasos uno al lado del otro: 1) contar el proyecto, 2) revisar la
  // propuesta, 3) presupuesto y documento. En pantallas estrechas se apilan.
  return (
    <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
      <Paso numero={1} titulo="Cuéntanos tu proyecto" Icono={SparklesIcon}>
        <Card>
          <CardHeader className="flex items-center gap-4">
            <AvatarIA className="size-14" />
            <div className="relative rounded-xl rounded-tl-none bg-muted/60 px-3 py-2">
              <p className="text-sm font-medium">¡Hola! Soy tu asistente.</p>
              <CardDescription>
                Explícame con tus palabras qué necesitas y te propondré los
                servicios adecuados.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={enviar} className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Ejemplos ficticios:
                </span>
                {EJEMPLOS.map((ej) => (
                  <Button
                    key={ej.etiqueta}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => usarEjemplo(ej)}
                  >
                    {ej.etiqueta}
                  </Button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="cliente">Nombre del cliente o empresa</Label>
                <Input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Ej.: Restaurante La Brasa Imaginaria"
                  autoComplete="organization"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="descripcion">¿Qué necesitas?</Label>
                <Textarea
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej.: Necesito una web para mi restaurante con la carta, un formulario de reservas y en dos idiomas."
                  aria-invalid={excedido || undefined}
                  aria-describedby="descripcion-ayuda"
                  className="min-h-32"
                />
                <div
                  id="descripcion-ayuda"
                  className="flex justify-between gap-4 text-xs text-muted-foreground"
                >
                  <span>Mínimo {limites.descripcionMin} caracteres.</span>
                  <span
                    className={cn("font-mono", excedido && "text-destructive")}
                  >
                    {longitud.toLocaleString("es-ES")} /{" "}
                    {limites.descripcionMax.toLocaleString("es-ES")}
                  </span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-11 text-base"
                disabled={cargando}
              >
                {cargando ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  <SparklesIcon />
                )}
                {cargando ? "Analizando tu proyecto…" : "Proponer servicios"}
              </Button>

              {resultado && !resultado.ok && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle className="flex items-center justify-between gap-2">
                    {resultado.error}
                    <Badge variant="destructive">
                      HTTP {resultado.status || "—"}
                    </Badge>
                  </AlertTitle>
                  {resultado.detalles.length > 0 && (
                    <AlertDescription>
                      <ul className="list-inside list-disc">
                        {resultado.detalles.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  )}
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </Paso>

      <Paso
        numero={2}
        titulo="Revisa la propuesta"
        Icono={ClipboardListIcon}
        activo={Boolean(enCurso || propuesta)}
      >
        {enCurso ? (
          <section
            className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-4"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              <AvatarIA className="size-10 animate-bounce" />
              <span className="flex items-center gap-2">
                <Loader2Icon className="size-4 animate-spin text-primary" />
                La IA está preparando la propuesta…
              </span>
            </span>
            <p className="min-h-5 text-sm text-muted-foreground">
              {enCurso.resumen}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-text-bottom" />
            </p>
            {enCurso.servicios.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {enCurso.servicios.map((s) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </section>
        ) : propuesta ? (
          <PropuestaVista
            cliente={propuesta.cliente}
            propuesta={propuesta.propuesta}
            avisos={propuesta.avisos}
            onCalculo={setPresupuesto}
          />
        ) : (
          <Hueco>
            Cuando envíes tu proyecto, aquí verás los servicios que propone la
            IA para que los aceptes, elimines o añadas otros.
          </Hueco>
        )}
      </Paso>

      <Paso
        numero={3}
        titulo="Presupuesto y PDF"
        Icono={FileTextIcon}
        activo={Boolean(presupuesto)}
      >
        {propuesta && presupuesto ? (
          <Card>
            <CardContent className="flex flex-col gap-6">
              <ResumenImportes presupuesto={presupuesto} />
              <Separator />
              {/* key: un cálculo nuevo reinicia el documento */}
              <DocumentoPresupuesto
                key={JSON.stringify(presupuesto.seleccion)}
                cliente={propuesta.cliente}
                resumenInicial={propuesta.propuesta.resumen}
                dudasIniciales={propuesta.propuesta.dudas}
                pendientesIniciales={propuesta.propuesta.pendientes}
                seleccion={presupuesto.seleccion}
                desglose={presupuesto.lineas}
                total={presupuesto.total}
                descripciones={presupuesto.descripciones}
              />
            </CardContent>
          </Card>
        ) : (
          <Hueco>
            Cuando confirmes los servicios, aquí tendrás el total calculado por
            el servidor y el documento listo para descargar en PDF.
          </Hueco>
        )}
      </Paso>
    </div>
  )
}

function Paso({
  numero,
  titulo,
  Icono,
  activo = true,
  children,
}: {
  numero: number
  titulo: string
  Icono: typeof InfoIcon
  activo?: boolean
  children: React.ReactNode
}) {
  return (
    // Las columnas entran escalonadas, de izquierda a derecha
    <section
      className="flex min-w-0 flex-col gap-3 animate-in fade-in slide-in-from-bottom-6 fill-mode-both duration-700 ease-out"
      style={{ animationDelay: `${100 + (numero - 1) * 140}ms` }}
    >
      <h2 className="flex items-center gap-3 text-lg font-semibold tracking-tight">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
            activo
              ? "border-primary bg-primary text-primary-foreground"
              : "text-muted-foreground"
          )}
        >
          {numero}
        </span>
        <span className={cn(!activo && "text-muted-foreground")}>{titulo}</span>
        <Icono
          className={cn(
            "ml-auto size-5",
            activo ? "text-primary" : "text-muted-foreground/50"
          )}
        />
      </h2>
      {children}
    </section>
  )
}

// Cara de la mascota, recortada en círculo: representa al asistente de IA
function AvatarIA({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-2 border-primary/60 bg-primary/15 shadow-sm",
        className
      )}
    >
      <Image
        src={camaron}
        alt=""
        sizes="56px"
        className="absolute inset-x-0 top-0 h-auto w-full scale-[1.35] origin-top"
      />
    </span>
  )
}

function Hueco({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex min-h-40 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-balance text-muted-foreground">
      {children}
    </p>
  )
}

function ResumenImportes({
  presupuesto,
}: {
  presupuesto: PresupuestoCalculado
}) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <span className="flex items-center justify-between gap-2 font-medium">
        Presupuesto
        <Badge variant="secondary">Calculado por el servidor</Badge>
      </span>
      {presupuesto.lineas.map((l) => (
        <div key={l.id} className="flex justify-between gap-4 text-sm">
          <span>
            {l.nombre}
            {l.cantidad > 1 && (
              <span className="text-muted-foreground">
                {" "}
                · {l.cantidad} × {euros(l.precioUnitario)}
              </span>
            )}
          </span>
          <span className="font-mono">{euros(l.importe)}</span>
        </div>
      ))}
      <Separator className="my-1" />
      <div className="flex items-end justify-between">
        <span className="font-medium">Total</span>
        <span className="text-3xl font-semibold tracking-tight text-primary">
          {euros(presupuesto.total)}
        </span>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {presupuesto.moneda} · sin impuestos
      </p>
    </div>
  )
}

function PropuestaVista({
  cliente,
  propuesta,
  avisos,
  onCalculo,
}: {
  cliente: string
  propuesta: Propuesta
  avisos: string[]
  onCalculo: (presupuesto: PresupuestoCalculado | null) => void
}) {
  return (
    <Card aria-live="polite">
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="flex items-center justify-between gap-2 text-sm font-medium">
            Propuesta para {cliente}
            <Badge variant="secondary">Generada con IA</Badge>
          </span>
          {propuesta.resumen && (
            <p className="text-sm text-muted-foreground">{propuesta.resumen}</p>
          )}
        </div>

        <ListaNotas
          titulo="Dudas para aclarar"
          Icono={CircleHelpIcon}
          items={propuesta.dudas}
        />
        <ListaNotas
          titulo="Pendiente de valorar (fuera del catálogo)"
          Icono={AlertCircleIcon}
          items={propuesta.pendientes}
        />

        {avisos.length > 0 && (
          <Alert>
            <InfoIcon />
            <AlertTitle>Correcciones del servidor</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc">
                {avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* key: una propuesta nueva reinicia la revisión */}
        <RevisionPropuesta
          key={JSON.stringify(propuesta.servicios)}
          propuestos={propuesta.servicios}
          onCalculo={onCalculo}
        />

        <p className="text-xs text-muted-foreground">
          La IA solo propone servicios; el precio lo calcula nuestro servidor
          con sus tarifas y no incluye plazos ni compromisos de entrega.
        </p>
      </CardContent>
    </Card>
  )
}

function ListaNotas({
  titulo,
  Icono,
  items,
}: {
  titulo: string
  Icono: typeof InfoIcon
  items: string[]
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icono className="size-4 text-primary" />
        {titulo}
      </span>
      <ul className="flex list-inside list-disc flex-col gap-1 text-sm text-muted-foreground">
        {items.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  )
}
