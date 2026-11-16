import { Inicio } from "@/components/inicio"

export default function Page() {
  return (
    <main className="relative mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-6 px-4 py-6 sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 mx-auto h-96 max-w-3xl rounded-full bg-primary/20 blur-3xl"
      />

      {/* Pantalla de inicio para elegir entre la IA y la configuración manual */}
      <Inicio />

      <footer className="mt-auto pt-8 text-xs text-muted-foreground">
        API: Node.js + Express · Interfaz: Next.js + shadcn/ui · Pulsa{" "}
        <kbd className="rounded border px-1 font-mono">d</kbd> para cambiar el tema
      </footer>
    </main>
  )
}
