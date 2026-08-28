# worker-catalogo — proxy de SharePoint para el catálogo de la Calculadora

Cloudflare Worker chico (un solo archivo, `src/index.ts`) que existe por un problema
puntual: SharePoint no deja leer el `.xlsx` del catálogo por `fetch()` desde otro origen
(CORS), así que la Calculadora (GitHub Pages) no puede pedirlo directo. Este Worker es
el intermediario — descarga el archivo desde el enlace compartido de SharePoint, lo
cachea ~12 h y lo sirve con CORS acotado al origen de la webapp.

Sirve los **bytes del `.xlsx` tal cual**, no un JSON derivado: la Calculadora reutiliza
su propio parser (`src/excelCatalogo.ts`, `procesarLibroCatalogo`) para que nunca
existan dos formatos que se puedan desincronizar.

## Por qué esta arquitectura (y qué se descartó)

- **¿Por qué no leer SharePoint directo desde la webapp?** CORS lo bloquea — confirmado
  en vivo, no es una suposición.
- **¿Por qué cachear en el Worker en vez de KV/D1?** El catálogo es chico (~20 KB) y de
  bajo tráfico (uso interno del equipo). La Cache API de Workers (`caches.default`) no
  necesita crear ningún recurso adicional en Cloudflare — cero pasos extra de
  aprovisionamiento. La única desventaja real es que el cache es por-datacenter (no
  100% consistente entre POPs), aceptable para este caso: en el peor caso, un POP
  distinto vuelve a pedirle el archivo a SharePoint, no rompe nada.
- **¿Por qué servir bytes y no JSON?** Pedido explícito — así la Calculadora usa
  siempre el mismo parser para un archivo subido a mano o traído de SharePoint. Si
  algún día el parser cambia, cambia en un solo lugar.
- **¿Por qué no hay un secret/token para llamar al Worker?** Cualquier secret quedaría
  igual visible en el bundle JS público de la webapp (GitHub Pages no tiene backend),
  así que no protegería nada realmente — solo daría falsa sensación de seguridad. Lo que
  sí protege el token real de SharePoint es que **nunca sale del Worker**: vive como
  secret de Cloudflare, no en ningún archivo, no en el bundle de la webapp.
- **¿Por qué no hay rate-limit del lado del código para el refresco forzado
  (`?actualizar=1`)?** Tráfico interno bajo, y Cloudflare ya protege contra abuso a
  nivel de red. Si en algún momento hace falta, se agrega una regla de Rate Limiting
  desde el dashboard de Cloudflare (Zona → Security → WAF) sin tocar este código.

## El "truco" de descarga (y por qué el fetch es manual, no automático)

Un enlace de SharePoint como
`https://tenant-my.sharepoint.com/:x:/g/personal/.../ID?e=xxxxx` normalmente sirve una
página de vista previa HTML, no el archivo. Agregando `&download=1` SharePoint
responde con un **302** hacia la biblioteca de documentos real — pero ese 302 además fija
cookies de autenticación anónima (`FedAuth`) que **hay que reenviar** en la siguiente
petición, o SharePoint devuelve 403. Verificado a mano:

```
curl -L "...?e=xxx&download=1"                  → 403 (sin manejo de cookies)
curl -L -c cookies.txt -b cookies.txt "...&download=1"  → 200, .xlsx real
```

Por eso `descargarDesdeSharePoint()` en `src/index.ts` sigue el redirect **a mano**
(`redirect: 'manual'`) y reenvía las cookies explícitamente, en vez de confiar en que el
`fetch()` del runtime las maneje solo.

## Desarrollo local

```
npm install
copy .dev.vars.example .dev.vars
```

Editar `.dev.vars` y pegar la URL real de SharePoint (la misma que Matías pasó para
pruebas). **`.dev.vars` está en `.gitignore` — nunca se commitea.**

```
npm run dev
```

Levanta el Worker en `http://127.0.0.1:8787`. Probar:

```
curl -i "http://127.0.0.1:8787/?actualizar=1"
```

Debería responder `200` con `Content-Type:
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y el `.xlsx` real en
el body (`X-Catalogo-Cache: BYPASS` la primera vez; sin `?actualizar=1`, la siguiente
pega en cache y trae `X-Catalogo-Cache: HIT`).

```
npm test
```

Corre los tests de la lógica pura (`construirUrlDescarga`, `origenPermitido`,
`pareceXlsx`, `comoHeaderCookie`) — no el `fetch()` completo, que necesita el runtime de
Workers y se prueba a mano con `wrangler dev` como arriba.

## Despliegue a producción

Ver el paso a paso completo (para copiar/pegar en `cmd`) en el `VALIDAR-*.md` de
`webapp/` de esta misma entrega. Resumen:

```
npm install
wrangler login
wrangler secret put CATALOGO_XLSX_URL
wrangler deploy
```

`wrangler deploy` imprime la URL pública del Worker
(`https://welearn-catalogo-proxy.<subdominio>.workers.dev`) — esa URL (no secreta) va en
`VITE_CATALOGO_WORKER_URL` del `.env` de `webapp/`.

## Si hay que rotar el enlace de SharePoint

Si el archivo se mueve o el enlace vence: generar un nuevo enlace "Cualquier persona con
el vínculo puede ver" en SharePoint y correr de nuevo `wrangler secret put
CATALOGO_XLSX_URL` con la URL nueva — no hace falta redeploy de código, el secret se
actualiza solo. El caché existente en el Worker sigue sirviendo la versión vieja hasta
que expire (~12 h) o hasta el primer `?actualizar=1`.

## Origenes permitidos (CORS)

Lista en `ORIGENES_PERMITIDOS` (`src/index.ts`): el dominio de GitHub Pages de la
Calculadora + los puertos de Vite en `localhost` (para poder probar la integración en
dev). Agregar ahí si la webapp se sirve alguna vez desde otro dominio.
