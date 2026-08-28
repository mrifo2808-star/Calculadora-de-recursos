/**
 * Proxy + cache de Cloudflare Worker para el catalogo de tasas de la Calculadora
 * WeLearn: descarga el .xlsx compartido en SharePoint (enlace anonimo, token en el
 * secret CATALOGO_XLSX_URL — nunca en este archivo), lo cachea ~12h y lo sirve con
 * CORS acotado al origen de la webapp. Ver README.md de esta carpeta para el
 * despliegue paso a paso.
 *
 * Por que existe: SharePoint no deja leer el archivo por fetch() desde otro origen
 * (CORS), asi que la Calculadora no puede pedirlo directo — este Worker es el unico
 * intermediario. Sirve los BYTES del xlsx tal cual (no un JSON derivado): la webapp
 * reutiliza su propio parser (excelCatalogo.ts, procesarLibroCatalogo) para que nunca
 * existan dos formatos que se puedan desincronizar.
 */

export interface Env {
  /** URL de "Copiar vinculo" de SharePoint (enlace anonimo). SECRETO — nunca en
   * codigo ni en wrangler.jsonc: se carga con `wrangler secret put CATALOGO_XLSX_URL`
   * (produccion) o en `.dev.vars` (local, en .gitignore, nunca commiteado). */
  CATALOGO_XLSX_URL: string;
}

/** Origenes desde los que el navegador puede leer la respuesta (CORS). Ajustar si la
 * webapp se sirve desde otro dominio. Los puertos de Vite (dev/preview) quedan
 * permitidos para poder probar la integracion en local. */
const ORIGENES_PERMITIDOS = [
  'https://mrifo2808-star.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCE_HORAS_SEG = 12 * 60 * 60;

/** Agrega (o reemplaza) `download=1` en la URL compartida de SharePoint — el "truco"
 * que hace que SharePoint devuelva el archivo en vez de la pagina de vista previa. No
 * toca el resto de la query string (en particular el token `e=`). */
export function construirUrlDescarga(urlCompartir: string): string {
  const url = new URL(urlCompartir);
  url.searchParams.set('download', '1');
  return url.toString();
}

/** true si `origin` esta en la lista permitida. `origin` es null en requests sin
 * header Origin (navegacion directa, curl, servidor-a-servidor) — esas se dejan pasar:
 * CORS es una restriccion que hace cumplir el navegador sobre llamadas fetch/XHR de
 * OTRO sitio, no una forma real de exigir credenciales; bloquear "sin Origin" solo
 * romperia pruebas manuales sin sumar seguridad real. Lo que sí se bloquea es un
 * Origin presente que no calce con la lista — eso es exactamente lo que CORS protege
 * (que otra pagina web use este endpoint contra un visitante suyo). */
export function origenPermitido(origin: string | null): boolean {
  if (!origin) return true;
  return ORIGENES_PERMITIDOS.includes(origin);
}

function headersCors(origin: string | null): HeadersInit {
  const headers: Record<string, string> = { Vary: 'Origin' };
  if (origin && ORIGENES_PERMITIDOS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/** Junta los `Set-Cookie` de una respuesta en un header `Cookie` para la siguiente
 * peticion. `getSetCookie()` (Headers de Workers) devuelve cada cookie por separado —
 * `headers.get('set-cookie')` las uniria con coma y rompería el formato (las cookies
 * de SharePoint traen fechas de expiracion con coma adentro). */
export function comoHeaderCookie(headers: Headers): string {
  const crudas = typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [];
  return crudas.map((c) => c.split(';')[0]).join('; ');
}

/**
 * Descarga el .xlsx desde SharePoint. El enlace de "descarga" no devuelve el archivo
 * directo: responde con un 302 que ademas fija cookies de autenticacion anonima
 * (FedAuth) para la biblioteca de documentos, y HAY que reenviar esas cookies en la
 * peticion a la URL redirigida o SharePoint devuelve 403 (verificado a mano: curl -L
 * sin manejo de cookies entre el 302 y el GET final da 403; con las cookies del 302
 * reenviadas, da 200 con el xlsx). Por eso el redirect se sigue a mano en vez de
 * confiar en el `redirect: 'follow'` automatico de fetch().
 */
async function descargarDesdeSharePoint(urlCompartir: string): Promise<Response> {
  const primera = await fetch(construirUrlDescarga(urlCompartir), { redirect: 'manual' });

  if (primera.status < 300 || primera.status >= 400) {
    // No hubo redirect (podria pasar si SharePoint cambia de comportamiento): se usa
    // la respuesta tal cual, la validacion de magic bytes mas abajo la filtra si no
    // es un xlsx de verdad.
    return primera;
  }

  const ubicacion = primera.headers.get('location');
  if (!ubicacion) throw new Error('SharePoint redirigio sin header Location.');
  const cookie = comoHeaderCookie(primera.headers);
  const urlAbsoluta = new URL(ubicacion, primera.url).toString();

  return fetch(urlAbsoluta, {
    redirect: 'follow',
    headers: cookie ? { Cookie: cookie } : undefined,
  });
}

/** Un .xlsx es un zip: empieza con la firma "PK". Chequeo barato para no cachear ni
 * servir una pagina de error/login de SharePoint como si fuera el catalogo. */
export function pareceXlsx(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

const CACHE_KEY = new Request('https://catalogo-welearn.internal/catalogo.xlsx');

async function manejarGet(env: Env, origin: string | null, forzar: boolean): Promise<Response> {
  const cache = caches.default;

  if (!forzar) {
    const enCache = await cache.match(CACHE_KEY);
    if (enCache) {
      const respuesta = new Response(enCache.body, enCache);
      respuesta.headers.set('X-Catalogo-Cache', 'HIT');
      for (const [k, v] of Object.entries(headersCors(origin))) respuesta.headers.set(k, v);
      return respuesta;
    }
  }

  let origen: Response;
  try {
    origen = await descargarDesdeSharePoint(env.CATALOGO_XLSX_URL);
  } catch (err) {
    return new Response(`No se pudo contactar SharePoint: ${err instanceof Error ? err.message : String(err)}`, {
      status: 502,
      headers: headersCors(origin),
    });
  }

  if (!origen.ok) {
    return new Response(`SharePoint respondio ${origen.status} al pedir el archivo.`, {
      status: 502,
      headers: headersCors(origin),
    });
  }

  const bytes = new Uint8Array(await origen.arrayBuffer());
  if (!pareceXlsx(bytes)) {
    return new Response(
      'La respuesta de SharePoint no parece un .xlsx (¿el enlace vencio, cambio de permisos, o pide login?).',
      { status: 502, headers: headersCors(origin) },
    );
  }

  const respuesta = new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': TIPO_XLSX,
      'Cache-Control': `public, max-age=${DOCE_HORAS_SEG}`,
      'X-Catalogo-Cache': forzar ? 'BYPASS' : 'MISS',
      ...headersCors(origin),
    },
  });
  // Se cachea SIEMPRE (incluso en un refresco forzado) para que el siguiente pedido
  // normal reciba esta version nueva en vez de la vieja.
  await cache.put(CACHE_KEY, respuesta.clone());
  return respuesta;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...headersCors(origin),
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return new Response('Metodo no soportado.', { status: 405, headers: headersCors(origin) });
    }

    if (!origenPermitido(origin)) {
      return new Response('Origen no autorizado.', { status: 403, headers: headersCors(origin) });
    }

    if (!env.CATALOGO_XLSX_URL) {
      return new Response('CATALOGO_XLSX_URL no esta configurado en este Worker (falta el secret).', {
        status: 500,
        headers: headersCors(origin),
      });
    }

    const forzar = url.searchParams.has('actualizar') || url.searchParams.has('force');
    return manejarGet(env, origin, forzar);
  },
};
