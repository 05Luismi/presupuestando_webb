// /api/... — Sirve la API de Express (server/app.js) dentro de la propia app de Next.
//
// Así la web y la API se despliegan juntas en un único proyecto de Vercel.
// La primera petición arranca Express en un puerto local libre (127.0.0.1) y a
// partir de ahí cada petición se reenvía tal cual: método, cabeceras y cuerpo.
// Las rutas propias de Next (p. ej. /api/ia/propuesta) tienen prioridad sobre esta.

import type { AddressInfo } from "node:net"
import type { NextRequest } from "next/server"

import app from "@servidor/app.js"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

let urlBase: Promise<string> | undefined

function arrancarExpress(): Promise<string> {
  urlBase ??= new Promise((resolve, reject) => {
    const servidor = app.listen(0, "127.0.0.1", () => {
      const { port } = servidor.address() as AddressInfo
      resolve(`http://127.0.0.1:${port}`)
    })
    servidor.on("error", (err: Error) => {
      urlBase = undefined
      reject(err)
    })
  })
  return urlBase
}

async function reenviar(request: NextRequest): Promise<Response> {
  const base = await arrancarExpress()
  const { pathname, search } = request.nextUrl

  const cabeceras = new Headers(request.headers)
  cabeceras.delete("host")
  cabeceras.delete("connection")

  const tieneCuerpo = request.method !== "GET" && request.method !== "HEAD"
  const respuesta = await fetch(`${base}${pathname}${search}`, {
    method: request.method,
    headers: cabeceras,
    body: tieneCuerpo ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  })

  const salida = new Headers(respuesta.headers)
  // fetch ya ha descomprimido el cuerpo: estas cabeceras dejarían de ser ciertas
  salida.delete("content-encoding")
  salida.delete("content-length")
  salida.delete("transfer-encoding")
  salida.delete("connection")

  return new Response(respuesta.body, { status: respuesta.status, headers: salida })
}

export {
  reenviar as GET,
  reenviar as POST,
  reenviar as PUT,
  reenviar as PATCH,
  reenviar as DELETE,
}
