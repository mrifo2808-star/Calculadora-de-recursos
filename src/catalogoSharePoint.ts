/**
 * Piezas PURAS (sin depender de `xlsx`) del flujo de sincronización del catálogo desde
 * SharePoint — a proposito separadas de `obtenerCatalogoDesdeSharePoint` (que sí
 * necesita el parser de excelCatalogo.ts, y por eso vive ahí: excelCatalogo.ts ya se
 * carga con `import()` dinamico en todos sus usos, para no meter xlsx — ~500 KB — en el
 * bundle principal). Este archivo SÍ se importa estatico desde CatalogContext.tsx (para
 * decidir si toca sincronizar sin esperar un click), así que debe quedar liviano.
 *
 * La URL del Worker (VITE_CATALOGO_WORKER_URL) NO es secreta: es solo el endpoint
 * publico del proxy — el token real de SharePoint vive como secret del Worker, nunca
 * llega al navegador. Por eso esta URL sí puede vivir en `.env` igual que las
 * credenciales de Supabase.
 */

export const catalogoWorkerUrl = import.meta.env.VITE_CATALOGO_WORKER_URL as string | undefined;

/** true si esta build tiene configurado el proxy de SharePoint. La sincronizacion
 * queda deshabilitada (sin romper el resto de la app) si no lo esta — ej. en un
 * checkout local sin `.env` completo. */
export const catalogoWorkerConfigurado = Boolean(catalogoWorkerUrl);

/** Agrega `?actualizar=1` (o `&actualizar=1`) para que el Worker se salte su cache de
 * ~12h y traiga la version mas reciente de SharePoint. */
export function urlConForzado(base: string, forzar: boolean): string {
  if (!forzar) return base;
  const url = new URL(base);
  url.searchParams.set('actualizar', '1');
  return url.toString();
}

// ── Cuándo corresponde una sincronización automática (silenciosa, al abrir la app) ──

const CLAVE_ULTIMA_SYNC = 'welearn-calculadora-catalogo-ultima-sync';
const DOCE_HORAS_MS = 12 * 60 * 60 * 1000;

/** Por-navegador (no hay una marca compartida por el equipo): cada persona que abre la
 * app decide para sí misma si ya pasaron 12h desde su última sincronización exitosa. Si
 * varias personas abren la app casi al mismo tiempo tras esas 12h, puede haber más de
 * un intento simultáneo — inofensivo (el Worker ya cachea, y aplicar el mismo catálogo
 * dos veces no cambia nada), así que no se intenta coordinar entre pestañas/personas. */
export function ultimaSincronizacionGuardada(): Date | null {
  try {
    const guardada = localStorage.getItem(CLAVE_ULTIMA_SYNC);
    return guardada ? new Date(Number(guardada)) : null;
  } catch {
    return null;
  }
}

export function guardarUltimaSincronizacion(fecha: Date): void {
  try {
    localStorage.setItem(CLAVE_ULTIMA_SYNC, String(fecha.getTime()));
  } catch {
    // localStorage no disponible: no persiste entre recargas, pero no rompe nada.
  }
}

/** Pura (recibe `ahora`/`ultima` en vez de leerlos ella misma) para poder probarla sin
 * mockear Date/localStorage. */
export function sincronizacionAutomaticaDebida(ahora: Date, ultima: Date | null): boolean {
  if (!ultima) return true;
  return ahora.getTime() - ultima.getTime() > DOCE_HORAS_MS;
}

// ── Resguardo: no dejar que una sincronización automática borre el catálogo por un
// archivo de SharePoint vacío o incompleto, sin que nadie lo revise ──────────────────

export interface ChequeoSeguridad {
  ok: boolean;
  motivo?: string;
}

/** Un archivo de SharePoint con 0 filas válidas, o con muchas menos que el catálogo
 * actual (< 50%), probablemente está vacío/roto/a medio editar — no se aplica solo,
 * para no borrar el catálogo compartido sin que nadie lo apruebe. Aplica tanto a la
 * sincronización automática como a la manual («Actualizar catálogo»): ninguna de las
 * dos pasa por un diálogo de confirmación, y no existe una carga manual de Excel como
 * alternativa (SharePoint es la ÚNICA vía de actualización) — así que este chequeo es la
 * única red de seguridad del catálogo compartido. Si dispara, corresponde arreglar el
 * archivo de SharePoint (no hay forma de "forzarlo" desde la UI a propósito). */
export function chequearTamanoRazonable(actual: number, nuevo: number): ChequeoSeguridad {
  if (nuevo === 0) {
    return { ok: false, motivo: 'El archivo de SharePoint no tiene filas válidas — no se aplicó nada.' };
  }
  if (actual > 0 && nuevo < actual * 0.5) {
    return {
      ok: false,
      motivo:
        `El archivo de SharePoint trae muchas menos filas (${nuevo}) que el catálogo actual (${actual}) — ` +
        'parece incompleto, no se aplicó por seguridad. Revisa y corrige el archivo en SharePoint (puede estar a medio editar) y reintenta con «Actualizar catálogo».',
    };
  }
  return { ok: true };
}
