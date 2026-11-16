import { PresupuestoForm } from "@/components/presupuesto-form"
import { SolicitudForm } from "@/components/solicitud-form"

export default function Page() {
  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-primary/20 blur-3xl"
      />
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          Agencia web · Presupuestos al instante
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Presupuesta{" "}
          <span className="bg-linear-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
            mi web
          </span>
        </h1>
        <p className="max-w-2xl text-balance text-muted-foreground">
          Cuéntanos qué necesitas o configura tu web a mano y obtén un
          presupuesto desglosado. El precio lo calcula nuestro servidor con sus
          propias tarifas.
        </p>
      </header>

      {/* En pantallas anchas: IA a la izquierda; a la derecha, configuración manual y, a su lado, presupuesto y tarifas.
          En móvil se apilan (primero la IA). */}
      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        <section className="flex min-w-0 flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            ¿Te ayudamos con IA?
          </h2>
          <SolicitudForm />
        </section>

        <section className="@container flex min-w-0 flex-col gap-4 xl:col-span-2">
          <h2 className="text-xl font-semibold tracking-tight">
            ¿Prefieres configurarla tú?
          </h2>
          <PresupuestoForm />
        </section>
      </div>

      <footer className="mt-auto pt-8 text-xs text-muted-foreground">
        API: Node.js + Express · Interfaz: Next.js + shadcn/ui · Pulsa{" "}
        <kbd className="rounded border px-1 font-mono">d</kbd> para cambiar el tema
      </footer>
    </main>
  )
}
