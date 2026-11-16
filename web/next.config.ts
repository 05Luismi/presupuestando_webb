import path from "node:path"
import type { NextConfig } from "next"

// Carpeta raíz del proyecto (la que contiene server/ y el archivo .env)
const raiz = path.resolve("..")

// Carga el .env de la raíz en process.env SOLO en el servidor de Next, para que
// el Route Handler (app/api/ia/propuesta/route.ts) lea OPENAI_API_KEY.
// Las variables sin el prefijo NEXT_PUBLIC_ nunca se envían al navegador.
// (No se usa loadEnvConfig de @next/env: Next ya lo ha llamado para web/ y una
// segunda llamada devuelve lo que tenía en caché sin leer este archivo.)
// Si no hay .env (p. ej. en Vercel), se usan las variables del entorno.
try {
  process.loadEnvFile(path.join(raiz, ".env"))
} catch {
  // Sin .env en la raíz
}

const config: NextConfig = {
  // La raíz de Turbopack es la carpeta del proyecto: así el Route Handler puede
  // reutilizar la validación de server/ (catálogo, esquema, comprobaciones).
  turbopack: { root: raiz },

  // El resto de rutas /api/... las atiende la API de Express dentro de Next
  // (app/api/[...ruta]/route.ts), así web y API se despliegan juntas en Vercel.
  // Express y pdfkit se cargan desde node_modules en vez de empaquetarse.
  serverExternalPackages: ["express", "pdfkit"],

  // pdfkit lee en tiempo de ejecución las fuentes estándar (Helvetica…):
  // hay que incluirlas en la función de Vercel.
  outputFileTracingIncludes: {
    "/api/[...ruta]": ["./node_modules/pdfkit/js/data/**"],
  },
}

export default config
