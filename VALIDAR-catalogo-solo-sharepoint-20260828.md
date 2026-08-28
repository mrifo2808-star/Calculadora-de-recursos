# VALIDAR — Catálogo: se retira la carga manual de Excel, SharePoint queda como única vía

Rama: `claude/catalogo-solo-sharepoint-20260828` (pusheada, no mergeada — el merge/push
a `main` lo hace Matías). Sobre `main` @ `38a2156` (Worker de SharePoint ya desplegado y
`VITE_CATALOGO_WORKER_URL` ya en `.env`).

## Qué pediste

> "no será mejor sacar los otros botones? de carga de archivos... dejar solo el de
> descarga de catálogo... eliminar la carga manual de archivos del CATÁLOGO, evaluar si
> 'restaurar catálogo original' también corresponde retirar o mantener como salida de
> emergencia — decídelo con criterio. Se mantiene la DESCARGA. Delimita el alcance: esto
> es sobre el catálogo, NO sobre el import/export de la CUBICACIÓN, que debe seguir
> intacto. Si la UI mezcla o confunde ambos, dímelo y propone cómo separarlos. Cuida el
> caso de falla del Worker: mensaje claro y accionable, la app sigue usable con el
> último catálogo cargado. Limpia código muerto, tests y build id al día."

## Qué cambié

### 1. Se retiró la carga manual de Excel del catálogo
- `src/components/PanelCatalogo.tsx`: eliminado el botón **⬆ Cargar catálogo actualizado
  (Excel)**, el `<input type="file">` oculto, el handler `cargarArchivo` y el estado
  `subiendo`.
- `src/excelCatalogo.ts`: eliminada `catalogoDesdeArchivoExcel` (el wrapper que leía un
  `File` del input — era su único llamador).
- `src/CatalogContext.tsx`: eliminada `actualizarCatalogo` (upsert directo a Supabase —
  su único llamador era el handler de arriba). Verifiqué con grep que no queda ninguna
  otra referencia en `src/` ni en tests antes de borrarla.
- **Se mantiene intacto**: `procesarLibroCatalogo` (el parser puro, reusado por
  `descargarCatalogoExcel`/`obtenerCatalogoDesdeSharePoint` y por los tests) y
  `⬇ Descargar catálogo (Excel)` (exportación de solo lectura, sin cambios).

### 2. Decisión con criterio: "Restaurar catálogo original" se MANTIENE, como emergencia
**Flag para que lo valides**: decidí mantenerlo, no retirarlo. Razón: tu propio mensaje
lo planteaba como posible salida de emergencia, y con la carga manual ya retirada, si el
catálogo compartido queda roto (ej. una sincronización con datos corruptos, o alguien
edita mal una fila directo en Supabase) ya no hay ningún otro camino de recuperación
salvo entrar a Supabase a mano. "Restaurar catálogo original" vuelve al catálogo de
referencia incorporado en el código (`CATALOGO_BASE`, ~47 recursos), no al último Excel
de SharePoint — por eso lo re-etiqueté como **"⚠ Restaurar catálogo original
(emergencia)"** y reforcé el texto de confirmación para que quede claro que no es la
forma normal de actualizar. Si prefieres retirarlo igual (por ejemplo, porque confías en
que Supabase + SharePoint bastan y prefieres forzar que cualquier arreglo pase por
Supabase directo), es un cambio de una sola función — avísame.

### 3. Confusión Cubicación vs Catálogo (la marcaste tú mismo como algo a evaluar)
Confirmé el problema: `PanelParametros` (con **⬇ Exportar a Excel** / **⬆ Importar desde
Excel**, del dominio Cubicación) se renderiza en `App.tsx` **por encima de las tabs**,
así que quedaba visible siempre — incluso parado en la pestaña "Catálogo", donde convive
con los propios botones de Excel del catálogo. Antes de este cambio había además DOS
botones "⬆ subir Excel" en pantalla a la vez (uno de Cubicación, uno de Catálogo) con
significados completamente distintos.

**Arreglo aplicado**: agregué una prop `mostrarAcciones` a `PanelParametros` — los 3
botones de acción (Exportar/Importar/Restaurar plantilla), su input de archivo oculto y
el párrafo que explica "Importar desde Excel" ahora solo se muestran con la pestaña
**Cubicación** activa (`App.tsx` pasa `mostrarAcciones={vista === 'cubicacion'}`). Los
campos de parámetros (Proyecto/Cliente/N° cursos/N° semanas/Modalidad) siguen visibles
en todas las pestañas, porque son datos, no acciones de Excel, y son razonables de
ajustar sin cambiar de pestaña.

**Flag para que lo valides**: esto significa que "Restaurar plantilla" (resetea toda la
cubicación) ahora también solo se ve en la pestaña Cubicación — antes se podía disparar
desde cualquier pestaña. Me pareció el trade-off correcto (agrupé las 3 acciones juntas
por consistencia, en vez de dejar "Restaurar plantilla" suelta en todas partes), pero es
tu decisión si preferías que ese botón en particular siguiera siempre visible.

### 4. Manejo de falla del Worker — mensajes accionables, catálogo nunca en blanco
`src/excelCatalogo.ts` → `obtenerCatalogoDesdeSharePoint` ahora distingue 3 puntos de
falla y da un mensaje propio para cada uno (antes, una falla de red devolvía el error
crudo de `fetch`, tipo "Failed to fetch"):
- **Sin conexión / el Worker no responde**: "No se pudo contactar el proxy de
  catálogo — revisa tu conexión a internet. El catálogo actual se mantiene sin cambios;
  puedes reintentar con «Actualizar catálogo»."
- **El Worker responde con error HTTP** (ej. 502 si SharePoint cambió el enlace o
  permisos): incluye el status, y agrega "revisa que el enlace de SharePoint haya
  vencido o cambiado de permisos... avisa a quien administra el Worker."
- **La respuesta no se puede leer como Excel** (ej. una página de error/login en vez del
  archivo — no debería pasar porque el Worker ya filtra esto, pero es una segunda
  barrera del lado del cliente): mensaje explícito en vez de que el error crudo de la
  librería `xlsx` llegue a pantalla.

En los tres casos la función **lanza un `Error` sin haber tocado el catálogo actual**:
`CatalogContext.tsx` nunca reemplaza `catalogo` (el estado de React) hasta que
`obtenerCatalogoDesdeSharePoint` resuelve con éxito — así que la app queda usable con el
último catálogo cargado, nunca en blanco. Esto ya era así estructuralmente antes de mi
cambio; lo que agregué es que el mensaje que ve la persona ahora es claro y menciona el
botón de reintento («Actualizar catálogo» sigue clickeable en el estado de error).

También actualicé el mensaje de `chequearTamanoRazonable` (el resguardo de
`src/catalogoSharePoint.ts` que rechaza un archivo con muy pocas filas): antes decía
"usa «Cargar catálogo actualizado» para forzarlo a mano" — un botón que ya no existe.
Ahora dice que hay que corregir el archivo en SharePoint y reintentar.

### 5. Limpieza de código muerto
- `catalogoDesdeArchivoExcel` (excelCatalogo.ts) — eliminada, sin otros llamadores.
- `actualizarCatalogo` (CatalogContext.tsx, interfaz + implementación + `useMemo`) —
  eliminada, sin otros llamadores.
- Referencias a "Cargar catálogo actualizado (Excel)" ya inexistente, actualizadas en
  `README.md`, `.env.example`, y los comentarios de `catalogoSharePoint.ts`.

### 6. Tests
`src/excelCatalogo.test.ts`:
- Agregué 3 tests nuevos para los 3 mensajes de falla de `obtenerCatalogoDesdeSharePoint`
  (red, HTTP de error, contenido no-Excel) — usan `vi.doMock` para simular
  `catalogoWorkerUrl` configurado, sin depender de variables de entorno reales.
- **Encontré y arreglé una falla preexistente, no causada por este encargo**: 2 tests ya
  fallaban en `main` (los verifiqué con `git stash` antes de tocar nada) porque asumían
  que `VITE_CATALOGO_WORKER_URL` no estaba configurado en este entorno de pruebas — pero
  el `.env` de este checkout ya trae la URL real del Worker desde el encargo anterior
  (commit `38a2156`), así que el supuesto ya no era cierto. Los reescribí para mockear
  `catalogoWorkerUrl` explícitamente en vez de depender del `.env` ambiente — ahora no
  importan qué tenga el `.env` local.
- **Algo que asumí mal y corregí**: pensé que bytes arbitrarios (`[1,2,3,4]`) harían
  fallar el parser de `xlsx` con una excepción. En la práctica `XLSX.read` es tolerante y
  los interpreta como una celda de texto, sin lanzar error (devuelve 0 filas válidas, no
  un throw). Sí lanza excepción con contenido que "parece HTML" (`Invalid HTML: could
  not find <table>`) — es el caso real que puede pasar si SharePoint devuelve una página
  de login en vez del archivo, así que usé eso en el test.
- 65/65 tests pasan (`npm test -- --run`).

### 7. Build / lint
- `npm run build` — sin errores. Confirmé en la salida que `xlsx` (~487 KB) sigue en su
  propio chunk async (`dist/assets/xlsx-*.js`), separado de `dist/assets/index-*.js`
  (461 KB) — la disciplina de `import()` dinámico para no inflar el bundle principal
  sigue intacta (no se tocó ningún import estático de `xlsx`).
- `npm run lint` — solo los 3 warnings preexistentes de `react-refresh` (no relacionados
  a este cambio).
- `BUILD_ID` (`src/buildInfo.ts`) ya decía `2026-08-28` (bumpeado en el encargo anterior,
  mismo día calendario) — no había nada que bumpear con el criterio de fecha del
  proyecto; queda igual.

## Qué NO se tocó (dominio Cubicación, según lo pediste)
`src/importCubicacion.ts`, `src/exportCubicacion.ts` y los botones **⬇ Exportar a
Excel** / **⬆ Importar desde Excel** de `PanelParametros.tsx` siguen exactamente igual
en su lógica — el único cambio ahí es que ahora se ocultan fuera de la pestaña
Cubicación (ver punto 3), no un cambio de comportamiento.

## Cómo verificar (< 10 min)

1. `git checkout claude/catalogo-solo-sharepoint-20260828 && npm install && npm run dev`
2. Pestaña **Catálogo**: confirmar que solo aparecen 3 botones —
   `🔄 Actualizar catálogo (SharePoint)`, `⚠ Restaurar catálogo original (emergencia)`,
   `⬇ Descargar catálogo (Excel)` — y que NO hay ningún botón de subir archivo.
3. Con la pestaña **Catálogo** activa, confirmar que NO se ve el panel de "Parámetros
   del proyecto" con sus botones de Excel (ese panel debe verse SIN botones, solo el
   título "Parámetros del proyecto" — los campos de Proyecto/Cliente/etc. si están, más
   abajo).
4. Ir a la pestaña **Cubicación**: confirmar que ahí SÍ aparecen
   `⬇ Exportar a Excel` / `⬆ Importar desde Excel` / `Restaurar plantilla`, sin cambios
   de comportamiento.
5. En Catálogo, click en `🔄 Actualizar catálogo (SharePoint)` con conexión normal:
   debe sincronizar y mostrar "Última actualización desde SharePoint: hace un momento."
6. Simular una falla (ej. cortar la red o cambiar momentáneamente
   `VITE_CATALOGO_WORKER_URL` a una URL inválida en `.env` y reiniciar `npm run dev`),
   click en `🔄 Actualizar catálogo`: debe aparecer un mensaje de error concreto (no
   "Failed to fetch" crudo) y la tabla del catálogo NO debe quedar vacía.
7. `npm test -- --run` → 65/65. `npm run build` → sin errores, `xlsx` en chunk separado.

## Pasos exactos para ti (cmd.exe)

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git fetch origin
git log --oneline origin/claude/catalogo-solo-sharepoint-20260828 -5
git checkout main
git merge --no-ff origin/claude/catalogo-solo-sharepoint-20260828
git push origin main
```

Si prefieres revisar antes en un checkout aparte sin tocar tu `main` local:
```
git checkout claude/catalogo-solo-sharepoint-20260828
npm install
npm run dev
```

## Cómo revertir
La rama no se mergeó a `main` — si decides no usar este cambio, simplemente no la
mergees. Si ya la mergeaste y quieres deshacerla: `git revert <hash-del-merge>` (crea un
commit nuevo que deshace el cambio, no reescribe historia).

## Pendiente / a tu criterio
1. **Validar la decisión de mantener "Restaurar catálogo original"** (punto 2 arriba) —
   o pedir que se retire si prefieres forzar que cualquier arreglo pase por Supabase
   directo.
2. **Validar el ocultamiento de los botones de Cubicación fuera de su pestaña** (punto
   3) — en particular si "Restaurar plantilla" debería seguir visible siempre.
3. Sigue abierto (no es parte de este encargo): el catálogo triplicado (Excel RC7 /
   `catalogo.ts` / Supabase) mencionado en `CLAUDE.md` raíz — proyecto aparte.

## Qué resultó falso de la premisa
- Asumí que el entorno de tests no tenía `VITE_CATALOGO_WORKER_URL` configurado (como
  documentaban los tests existentes) — falso: el `.env` de este checkout ya trae la URL
  real desde el encargo anterior, lo que rompía 2 tests preexistentes sin relación
  directa con este encargo. Los arreglé de paso (ver punto 6).
- Asumí que bytes arbitrarios harían fallar el parser `xlsx` con una excepción — falso,
  es tolerante; solo contenido que "parece HTML" lanza error. Ajustado el test
  correspondiente.
