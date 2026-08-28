# VALIDAR — Catálogo sincronizado desde SharePoint (2026-08-28)

Rama: `claude/catalogo-sharepoint-20260828`, sobre `main` actualizado (confirmado:
`main`/`origin/main` en `b52c8c4` antes de empezar). **Push autorizado — ya está en
origin.** Merge del código y **despliegue del Worker** quedan para Matías (pasos exactos
al final — el Worker no lo puedo desplegar yo, no tengo cuenta de Cloudflare en este
entorno).

## Qué se pidió (resumen)

Vincular la Calculadora a `catalogo-welearn- v1.xlsx` en SharePoint (enlace anónimo)
para que el catálogo se actualice solo. SharePoint bloquea `fetch()` cross-origin, así
que hace falta un intermediario — arquitectura propuesta: Worker de Cloudflare que
descargue el archivo (truco `?download=1`), lo cachee ~12h y lo sirva con CORS acotado
al origen de GitHub Pages, sirviendo los BYTES del xlsx (o JSON del mismo parser) para
reutilizar el import existente. Con botón "Actualizar catálogo" + estados visibles, el
Worker no debe romper la app si falla, el import manual sigue de respaldo, y la URL de
SharePoint (secret) nunca se commitea.

## Arquitectura implementada — igual a la propuesta, con dos ajustes justificados

1. **El parser reutilizado es `excelCatalogo.ts`, no `importCubicacion.ts`.** El pedido
   textual decía "el import que ya existe (importCubicacion.ts)", pero ese módulo lee el
   formato de **Cubicación** (hojas Parametros/Gestion/Cubicacion) — un dominio de datos
   distinto. El catálogo de tasas (Estado/Tipo/Nombre visible/Extension/Unidad/DI/DG/
   SOP/ID técnico/Fuente/Observaciones) tiene su propio parser en `excelCatalogo.ts`
   (`catalogoDesdeArchivoExcel`, ya usado por "⬆ Cargar catálogo actualizado (Excel)").
   Asumí que fue un lapsus al nombrar el archivo — el `.xlsx` en cuestión es
   inequívocamente el catálogo ("es el mismo excel que se descarga de la calculadora"),
   no una cubicación. **Marcado para que lo confirmes**: si en realidad la intención era
   otra cosa, avisame.
2. **Cache API de Workers en vez de KV.** La propuesta no especificaba el mecanismo de
   cache. Elegí `caches.default` (nativo de Workers) en vez de crear un namespace KV:
   cero recursos adicionales que aprovisionar en Cloudflare, el catálogo es chico
   (~20 KB) y de bajo tráfico, y la única desventaja real (cache no 100% consistente
   entre datacenters de Cloudflare) es irrelevante acá — en el peor caso, un POP
   distinto vuelve a pedirle el archivo a SharePoint, no rompe nada. Detalle completo
   (incluida la razón de NO tener un secret/token para llamar al Worker, y de NO tener
   rate-limit en código para el refresco forzado) en `worker-catalogo/README.md`.

## Qué se implementó

### `worker-catalogo/` (Cloudflare Worker nuevo, dentro del mismo repo)

Un archivo (`src/index.ts`), sin dependencias más allá de `wrangler`/`vitest` para
desarrollo. Lo importante:

- **El "truco" de descarga necesita manejo manual de cookies** — hallazgo verificado a
  mano, no documentado en ningún lado que haya encontrado: el enlace `?download=1` de
  SharePoint responde con un 302 que además fija una cookie `FedAuth` de autenticación
  anónima; si esa cookie no se reenvía en la petición a la URL redirigida, SharePoint
  devuelve 403. `curl -L` sin manejo de cookies → 403; con cookie jar → 200 con el xlsx
  real. Por eso el Worker sigue el redirect a mano (`redirect: 'manual'`) y reenvía las
  cookies explícitamente, en vez de confiar en el comportamiento automático de `fetch()`.
- CORS acotado a `https://mrifo2808-star.github.io` + `localhost:5173`/`:4173` (para
  poder probar en dev).
- `?actualizar=1` (o `&force=1`) salta el cache de 12h.
- Valida que la respuesta empiece con la firma de zip "PK" antes de cachearla/servirla
  (si SharePoint devuelve una página de error/login en vez del archivo, no se cachea
  como si fuera el catálogo).
- 11 tests de la lógica pura (URL, CORS, validación de bytes, armado del header Cookie).

**Verificado en vivo, no solo por inspección de código**: corrí `wrangler dev` en local
con la URL REAL de SharePoint (autorizada para pruebas locales, nunca commiteada — en
`.dev.vars`, gitignored, ya borrada de este disco tras la prueba) y confirmé:
- Descarga real: 200 OK, `Content-Type` correcto, 21.934 bytes, `file` lo reconoce como
  "Microsoft Excel 2007+" — el mismo archivo que bajé por curl a mano al principio.
- Cache HIT en la segunda pedida (sin `?actualizar`).
- CORS: origen permitido → header correcto; origen no permitido → 403; preflight OPTIONS
  → 204 con los headers esperados.

### Webapp (`src/`)

- **`excelCatalogo.ts`**: se separó `procesarLibroCatalogo(buffer)` (lógica pura) de
  `catalogoDesdeArchivoExcel(archivo: File)` (wrapper fino) — mismo patrón que
  `importCubicacion.ts`. Se agregó `obtenerCatalogoDesdeSharePoint(forzar)`, que pega al
  Worker y reusa `procesarLibroCatalogo` — **un solo parser para ambos caminos** (subida
  manual o SharePoint), como pediste.
- **`catalogoSharePoint.ts`** (nuevo, sin `xlsx`): URL con/sin `?actualizar=1`, cuándo
  toca una sincronización automática (12h por navegador, en `localStorage`), y el
  resguardo de tamaño (ver abajo). Se importa **estático** en `CatalogContext.tsx` a
  propósito — por eso está separado de `excelCatalogo.ts` (que sí carga `xlsx`, ~500 KB):
  si el fetch+parse de SharePoint viviera en el mismo archivo que se importa estático,
  `xlsx` se colaría en el bundle principal aunque nadie sincronice nunca (exactamente el
  mismo error de bundle que cometí y corregí en una sesión anterior de esta misma app —
  volvió a aparecer acá y lo corregí de entrada esta vez, antes de terminar el build).
- **`CatalogContext.tsx`**: nuevo estado (`sincronizando`, `ultimaSincronizacion`,
  `errorSincronizacion`) y `sincronizarDesdeSharePoint(forzar)`. Se refactorizó
  `restaurarCatalogoOriginal` para compartir la lógica de reemplazo completo
  (borrar+insertar con respaldo/rollback si falla) con la sync de SharePoint — la sync
  **reemplaza** el catálogo entero (no solo agrega/actualiza como la subida manual), así
  SharePoint es de verdad la fuente de la verdad. Auto-sync silenciosa al montar, si
  pasaron 12h desde la última (o nunca hubo una) — sin bloquear el resto de la app si
  falla.
- **`PanelCatalogo.tsx`**: botón "🔄 Actualizar catálogo (SharePoint)" (solo aparece si
  `VITE_CATALOGO_WORKER_URL` está configurado), estados de carga/última actualización
  ("hace X min/h/d")/error con el mismo patrón `role=status`/`alert` +
  `panel__hint--ok/aviso` del sistema de diseño v1.1 que ya usa el resto del panel.
- `buildInfo.ts` → `2026-08-28`.
- 22 tests nuevos (62 en total, antes 40): parser del catálogo, URL/timing/resguardo de
  SharePoint, y el camino de error cuando el Worker no está configurado.

## Decisiones que tomé con criterio — a validar por Matías

1. **La sync desde SharePoint no tiene diálogo de confirmación** (a diferencia de
   "Cargar catálogo actualizado (Excel)", que sí lo tiene). Razón: ahí un humano elige
   un archivo arbitrario y debe poder revisarlo antes de aplicar; acá el archivo viene
   de una fuente ya curada/conocida (SharePoint, la misma que Matías edita), y el punto
   entero de "que se actualice sola" se pierde si cada sync automática tuviera que
   esperar un click. El único resguardo es automático: **si el archivo trae 0 filas
   válidas, o muchas menos que el catálogo actual (< 50%), no se aplica** — evita que un
   archivo vacío o a medio editar borre el catálogo compartido sin que nadie lo note.
2. **Sync = reemplazo completo, no upsert.** Si Matías borra un recurso en el Excel de
   SharePoint, también desaparece de Supabase (a diferencia de la carga manual, que
   nunca borra). Es la lectura más consistente con "que SharePoint sea la fuente" — pero
   si la intención era más conservadora (solo agregar/actualizar, nunca borrar), es
   cambiar una función en `CatalogContext.tsx` (`sincronizarDesdeSharePoint` llamando
   `actualizarCatalogo` en vez de `reemplazarCatalogoCompleto`).
3. **Auto-sync es por navegador, sin coordinación entre personas del equipo.** Cada
   quien decide para sí si pasaron 12h desde SU última sync exitosa (guardado en su
   propio `localStorage`). Si varias personas abren la app casi al mismo tiempo tras esas
   12h, puede haber más de un intento simultáneo — inofensivo (el Worker ya cachea, y
   aplicar el mismo catálogo dos veces no cambia nada), así que no armé nada más
   sofisticado (una marca compartida en Supabase, por ejemplo) para evitarlo.
4. **Sin secret para llamar al Worker.** Cualquier secret quedaría igual visible en el
   bundle JS público de GitHub Pages — no protegería nada real, solo daría falsa
   sensación de seguridad. Lo que sí importa (el token de SharePoint) nunca sale del
   Worker. Consecuencia: quien encuentre/adivine la URL del Worker puede bajar el
   catálogo directo (no es info sensible — son tasas internas de horas — y el archivo ya
   está "compartido con cualquiera que tenga el link" en SharePoint, mismo nivel de
   exposición que ya existía). Está en `worker-catalogo/README.md` para que quede claro
   por qué, no fue un descuido.
5. **Nombre del parser reutilizado** (`excelCatalogo.ts` en vez de `importCubicacion.ts`)
   — ver el punto 1 de arquitectura arriba.

## No se pudo verificar en vivo

El Worker SÍ se probó en vivo (`wrangler dev` local contra la URL real de SharePoint,
ver arriba) — lo que falta es el **despliegue real a Cloudflare** (no tengo cuenta en
este entorno) y el **flujo completo en la app desplegada** (sin la clave real del equipo
de Supabase no pude iniciar sesión para ver la pestaña Catálogo con el botón nuevo). Se
verificó sin regresiones el login y toda la lógica vía los 62+11 tests unitarios.

## Cómo verificar (código, < 10 min)

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3
npm run build
npm run lint
npm test
cd worker-catalogo
npm install
npm test
```

Todo debería salir limpio (build sin errores, lint con los mismos 3 warnings
preexistentes, 62 tests en la webapp + 11 en el Worker).

---

## Pasos EXACTOS para Matías (cmd de Windows)

### 1. Desplegar el Worker

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp\worker-catalogo"
npm install
npx wrangler login
```

Se abre el navegador para autorizar Wrangler con tu cuenta de Cloudflare (crear una
gratis en cloudflare.com si no tenés). Volvé a la consola cuando diga autorizado.

```
npx wrangler secret put CATALOGO_XLSX_URL
```

Va a pedir "Enter a secret value:" — pegá la URL completa de SharePoint (la misma que
me pasaste) y Enter. **Esto no queda en ningún archivo del repo**, solo en Cloudflare.

```
npm run deploy
```

Al final imprime algo como:

```
https://welearn-catalogo-proxy.TU-SUBDOMINIO.workers.dev
```

**Copiá esa URL completa** — la necesitás en el paso 3.

### 2. Confirmar que el Worker funciona

```
curl -i "https://welearn-catalogo-proxy.TU-SUBDOMINIO.workers.dev/?actualizar=1"
```

Tiene que responder `HTTP/1.1 200` con `Content-Type:
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Si da error, revisar
`npx wrangler tail` (deja ver los logs del Worker en vivo) mientras repetís el curl.

### 3. Mergear la Calculadora y agregar la URL del Worker

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git fetch origin
git log --oneline main..origin/claude/catalogo-sharepoint-20260828
git checkout main
git merge --ff-only origin/claude/catalogo-sharepoint-20260828
```

Ahora agregar la URL del Worker al `.env` (con Notepad o el editor que prefieras) —
abrir `.env` y agregar esta línea al final (con la URL real del paso 1):

```
VITE_CATALOGO_WORKER_URL=https://welearn-catalogo-proxy.TU-SUBDOMINIO.workers.dev
```

Guardar el archivo. Esta URL NO es secreta, así que sí se commitea:

```
git add .env
git commit -m "Agrega VITE_CATALOGO_WORKER_URL del Worker de catalogo desplegado"
git push origin main
```

El push dispara el deploy automático de GitHub Pages (Actions). Cuando termine, entrar
a la app, iniciar sesión, ir a la pestaña Catálogo y confirmar que aparece el botón
"🔄 Actualizar catálogo (SharePoint)" — probarlo y revisar que el catálogo se actualice
sin errores.

## Pendiente / requiere decisión de Matías

- Las 5 decisiones marcadas arriba — en particular la #2 (reemplazo completo vs. solo
  agregar) si algún recurso importante llegara a desaparecer sin querer del Excel.
- Confirmar que `excelCatalogo.ts` era el parser correcto a reutilizar (decisión #5 /
  punto 1 de arquitectura).
- Los 3 pasos de arriba (desplegar Worker, agregar el secret, mergear+push la webapp).
