# WeLearn — Calculadora de Recursos (web)

Calculadora web de horas DI / DG / SOP para proyectos de producción de cursos. Es la
versión web de `WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx` (veredicto APROBADO
RC7): mismo catálogo de tasas, mismo selector en cascada Tipo → Recurso, misma fórmula de
cálculo de horas y los mismos totales por sección, por curso y por proyecto.

El cálculo ocurre siempre en el navegador (Cubicación/Gestión/Resumen quedan en
`localStorage`, nunca se envían a ningún servidor). El **acceso a la app y el catálogo de
tasas** sí dependen de un backend (Supabase): hay una clave de equipo verificada del lado
del servidor y el catálogo se sincroniza en vivo para todos — ver
["Backend (Supabase)"](#backend-supabase-login-y-catálogo-compartido) más abajo para
configurarlo.

## Cómo funciona el cálculo

Para cada fila de producción:

```
Factor  = N° Semanas del proyecto, si Frecuencia = "Por semana"; 1 en cualquier otro caso
HH DI   = Cantidad × Factor × DI unitario (del recurso elegido en el catálogo)
HH DG   = Cantidad × Factor × DG unitario
HH SOP  = Cantidad × Factor × SOP unitario
Total   = HH DI + HH DG + HH SOP
```

Solo los recursos con Estado = **Validado** en el catálogo son seleccionables en la
cascada Tipo → Recurso. Una fila sin Tipo/Recurso completo queda como "Pendiente de
catalogar" y no suma horas. Se excluyeron del catálogo (respecto al RC7 original) los 2
recursos que no tenían ningún dato de tiempo DI/DG/SOP registrado ("Grafico plano" y
"Animacion T3"): sin ese dato no aportan al cálculo y solo generaban filas en 0.

Los cargos de "Gestión del proyecto" no consumen el catálogo de recursos. Hay dos
clases de fila, distinguidas por si son o no editables desde la interfaz (columna
`removable` en `GestionRow`, `types.ts`):

- **7 cargos BASE** (`CARGOS_BASE_GESTION` en `data/plantilla.ts`): van siempre en todo
  proyecto, con el porcentaje definido en el código. Su fórmula es

  ```
  HH gestión (cargo) = % del cargo × HH de producción × (0,56 + 0,44 × semanas ÷ 16)
  ```

  donde las HH de producción son las de los recursos de Cubicación en etapas activas,
  por curso (`totalRecursosCurso` en `calc.ts`) y las semanas son el mismo N° de semanas
  del proyecto que usa el Factor de las filas "Por semana". **No son editables ni
  eliminables desde la interfaz** — solo se pueden activar/desactivar; para cambiar un
  porcentaje o agregar/quitar un cargo base hay que editar `CARGOS_BASE_GESTION` en el
  código y desplegar. `reconciliarGestionBase` (mismo archivo) fuerza estos 7 valores en
  cada carga de `localStorage` y en cada importación de Excel, así que ni un archivo
  editado a mano ni un estado guardado viejo pueden alterarlos — están bloqueados de
  verdad, no solo ocultos en la interfaz.
- **Cargos agregados a mano** ("+ Agregar cargo"): totalmente editables y eliminables.
  Cada uno elige su propio **Tipo**: **Fijo** (misma fórmula de Factor que producción,
  Cantidad × Factor × HH unitaria) o **% Proyecto** (un % plano de las HH de producción,
  con su propio porcentaje y **sin** el ajuste por duración — ese porcentaje lo escribe
  quien cubica para ese proyecto, con su duración ya en mente).

### De dónde salen los porcentajes de los cargos base (10-09-2026)

Del modelo de estimación institucional `MODELO_ESTIMACION_v02.00.xlsx`, cubicación
validada por la Gerencia de Operaciones. Cada porcentaje es las HH que el modelo cubica
para ese rol divididas por las **3.500 HH** de su proyecto de referencia (16 semanas):

| Cargo | HH del modelo | % (HH ÷ 3.500) |
|---|--:|--:|
| Gestion JP | 108,75 | 3,107 % |
| Gestion DI Senior | 161,25 | 4,607 % |
| Gestion DG Senior | 56,25 | 1,607 % |
| Gestion Sop Senior | 56,25 | 1,607 % |
| Gestion DI TL | 39,375 | 1,125 % |
| Gestion DG TL | 30 | 0,857 % |
| Gestion Sop TL | 30 | 0,857 % |
| **Total** | **481,875** | **13,767 %** |

El ratio exacto es 13,7679 %; los 7 porcentajes redondeados a tres decimales suman
13,767 %, ~0,03 HH menos sobre el proyecto de referencia (0,006 %).

Estos valores **reemplazan** a los fijados a ojo el 27-08-2026 (JP 30 %, Senior
20/5/5 %, TL 5/5/5 % = **75 %** de la producción), que estaban ~5,4× por sobre el
modelo. Toda cubicación anterior arroja ahora un total menor.

**El ajuste por duración** (`factorDuracionGestion` en `calc.ts`) existe porque antes la
fórmula era ciega al calendario: 8 o 32 semanas pedían las mismas horas de jefatura. El
modelo separa las 481,875 HH en 210 HH (43,6 %) de dedicación sostenida —JP 10 %, DI TL
5 %, DI S 10 %, DG S 5 %, QA S 5 % de un FTE = 13,125 HH/semana × 16 semanas: comités,
seguimiento, informes— y 271,875 HH (56,4 %) de arranque, arquitectura, piloto e
implementación, que dependen del tamaño y no de la duración. De ahí el 0,56 / 0,44. A 16
semanas el factor vale exactamente 1; a 32 vale 1,44; a 8 vale 0,78; su piso es 0,56.

### Gestión docente (DI) — toggle de Cubicación (10-09-2026)

El interruptor **«Incluir gestión docente (DI)»** de la pestaña Cubicación (apagado por
defecto, `ParametrosCurso.gestionDocente`) suma 30 minutos semanales por curso de
coordinación con el docente:

```
HH gestión docente = 0,5 × N° cursos × N° semanas
```

Usa los mismos N° cursos y N° semanas de Parámetros. Se suma a la línea de **HH DI** del
Resumen (y por lo tanto a Total HH recursos y Total general), **encima** de los cargos base
de Gestión — no los reemplaza — y **no** entra en la base de los cargos % (si entrara,
esos cargos cobrarían gestión sobre horas de gestión). Con el toggle activo, la app muestra
siempre el desglose (`12 cursos × 16 semanas × 0,5 HH = 96 HH`), y el Excel exportado lo
escribe en la hoja Resumen y guarda el toggle en la columna «Gestión docente (DI)» de
Parámetros (columna opcional al importar: si falta, queda apagado).

La fórmula supone que todos los cursos están activos todas las semanas. **Decisión de
Matías:** el toggle cubre el caso estándar; sobre 16 semanas la app avisa (sin bloquear)
que sobreestima, y en proyectos largos la gestión docente se agrega como tarea desde el
catálogo. Lógica en `calcularGestionDocente` (`calc.ts`).

## Desarrollo local

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build   # genera dist/
npm run preview # sirve dist/ localmente para verificar el build
```

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` construye y publica `dist/` en GitHub Pages en
cada push a `main`. Pasos para activarlo la primera vez:

1. En GitHub → Settings → Pages, elegir **Source: GitHub Actions**.
2. Verificar que `vite.config.ts` tenga `base: '/<nombre-del-repo>/'` igual al nombre real
   del repositorio (actualmente `/Calculadora-de-recursos/`, para
   github.com/mrifo2808-star/Calculadora-de-recursos). Si el repo se renombra, actualizar
   esa línea antes de hacer push.
3. Hacer push a `main` — el Action queda visible en la pestaña "Actions" del repo.

## Backend (Supabase): login y catálogo compartido

La app está detrás de una clave de acceso **verificada del lado del servidor** (Supabase
Auth) y el catálogo de tasas vive en una tabla Postgres compartida — cualquier cambio lo
ven todos en vivo (Realtime), en vez de que cada quien tenga su propia copia en
`localStorage`.

### Por qué esto SÍ es seguridad real (a diferencia de una clave solo en el navegador)

Un password comparado en JavaScript en el navegador es inútil como control de acceso:
cualquiera puede leer el código fuente publicado y ver contra qué se compara. Con
Supabase, la clave se verifica en el servidor de Supabase (`auth.signInWithPassword`) y
las políticas de **Row Level Security (RLS)** en la base de datos son las que deciden
quién puede leer/escribir el catálogo — no hay forma de leer o modificar el catálogo sin
haber iniciado sesión, sin importar qué tan bien alguien inspeccione el JS del sitio.

### Configuración (una sola vez)

1. Crear un proyecto gratis en [supabase.com](https://supabase.com) (login con GitHub o
   email).
2. En el proyecto → **SQL Editor** → pegar y correr **todo** el contenido de
   [`supabase/migracion_inicial.sql`](supabase/migracion_inicial.sql) (crea la tabla
   `catalogo_recursos`, las políticas RLS, y siembra los 47 recursos vigentes).
3. En **Authentication → Users → Add user**, crear la cuenta compartida del equipo:
   - Email: `equipo@calculadora.welearn.cl` (debe coincidir con `EQUIPO_EMAIL` en
     `src/AccessGate.tsx`; si se usa otro email, actualizar esa constante).
   - Password: la clave que se va a compartir con el equipo.
   - Activar **"Auto Confirm User"** al crearla (si no, Supabase espera un correo de
     verificación que nunca va a llegar, porque esta cuenta no es un buzón real).
4. En **Project Settings → API**, copiar **Project URL** y **anon public key**.
5. Copiar `.env.example` a `.env` y completar esos dos valores. **Este `.env` sí se
   commitea** (no está en `.gitignore`): la anon key está diseñada por Supabase para ser
   pública, la seguridad la da RLS, no ocultar esta key. La única key que NUNCA debe
   commitearse ni pegarse en el frontend es la **service_role key**.
6. `npm run dev` (o hacer push a `main` para que el build de GitHub Actions la incluya).

Sin `.env` configurado, la app muestra una pantalla de "Falta configurar Supabase" en vez
de dejar pasar a cualquiera — nunca hace fallback silencioso a "sin login".

### Cómo se usa desde la app

- **Login**: pantalla de acceso pide solo la clave (el email de equipo va fijo en el
  código, no es un dato secreto). La sesión persiste en el dispositivo hasta "Cerrar
  sesión" (footer de la app).
- **Catálogo compartido**: en la pestaña "Catálogo", la única forma de traer cambios es
  **🔄 Actualizar catálogo (SharePoint)** (ver sección siguiente) — no existe una carga
  manual de Excel. **Restaurar catálogo original** es una salida de emergencia: reemplaza
  TODO el catálogo compartido por `CATALOGO_BASE` (con confirmación, porque afecta a todo
  el equipo) — úsalo solo si el catálogo compartido quedó en mal estado, no como forma
  habitual de actualizarlo. **⬇ Descargar catálogo (Excel)** es una exportación de solo
  lectura, no lo actualiza.
- Si Supabase no responde (caído, sin internet), la app muestra un aviso y cae de vuelta a
  `CATALOGO_BASE` como referencia de solo lectura — nunca se rompe silenciosamente.

### Sincronización del catálogo desde SharePoint (única vía de actualización)

El catálogo se mantiene al día desde un `.xlsx` compartido en SharePoint — el mismo
formato de columnas que exporta **⬇ Descargar catálogo (Excel)**. SharePoint no permite
leerlo por `fetch()` desde otro origen (CORS), así que hay un Cloudflare Worker de por
medio (`worker-catalogo/`, ver su `README.md`) que descarga el archivo, lo cachea ~12 h y
lo sirve con CORS acotado al origen de esta app.

- **Automático**: al abrir la app, si pasaron más de 12 h desde la última sincronización
  (por navegador), se sincroniza sola en segundo plano — sin diálogo, sin bloquear nada.
  Si el Worker no está configurado (`VITE_CATALOGO_WORKER_URL` vacío) o falla, la app
  sigue funcionando igual con el catálogo que ya tenía cargado (nunca queda en blanco).
- **Manual**: botón **🔄 Actualizar catálogo (SharePoint)** en la pestaña Catálogo (solo
  aparece si `VITE_CATALOGO_WORKER_URL` está configurado) — fuerza el refresco ahora
  mismo, saltando el caché de 12 h del Worker. Es también el botón de "reintentar" si una
  sincronización falló: el error queda visible con un mensaje accionable (qué revisar) y
  el catálogo actual no se toca hasta que una sincronización nueva termine con éxito.
- **Reemplaza** el catálogo compartido completo — para que SharePoint sea de verdad la
  fuente de la verdad y un recurso descontinuado ahí también desaparezca acá. Como
  resguardo, un archivo con 0 filas válidas o con muchas menos que el catálogo actual
  (< 50%) **no se aplica** (ver `chequearTamanoRazonable` en `src/catalogoSharePoint.ts`)
  — evita que un archivo vacío o a medio editar borre el catálogo del equipo sin que
  nadie lo revise. Si dispara, corresponde corregir el archivo en SharePoint (no hay
  forma de forzarlo a mano desde la UI, a propósito).
- No existe una carga manual de Excel como alternativa: si el Worker no responde, la
  única salida de emergencia es **Restaurar catálogo original** (vuelve a `CATALOGO_BASE`,
  no al último Excel de SharePoint) o corregir el archivo/Worker y reintentar.
- Ver `worker-catalogo/README.md` para desplegar el Worker (Cloudflare) y el `VALIDAR-*.md`
  de esta entrega para el paso a paso completo.

### Posibles mejoras futuras (quedan listas para construir sobre esto, no implementadas)

- Cuentas individuales en vez de una clave compartida (Supabase Auth ya lo soporta; solo
  falta una pantalla de gestión de usuarios y decidir roles/permisos por persona).
- Guardar los proyectos de Cubicación en Supabase en vez de `localStorage` (accesibles
  desde cualquier dispositivo, no solo el navegador donde se creó el proyecto).
- Roles (ej. "admin" puede editar catálogo, "viewer" solo calcula) usando una tabla de
  roles + políticas RLS adicionales en vez de que cualquier sesión pueda editar todo.

## Actualizar el catálogo de tasas (directo en el código)

`CATALOGO_BASE` (`src/data/catalogo.ts`, un array plano, sin build step de Excel) es el
catálogo de referencia incorporado en el código — se usa para sembrar Supabase
inicialmente (`supabase/migracion_inicial.sql`) y como respaldo de solo lectura si
Supabase no está configurado o no responde. El catálogo que la app usa día a día en
producción es el de Supabase, no este archivo:

1. Para un cambio puntual: editar el `.xlsx` de SharePoint y esperar la sincronización
   automática (o forzarla con el botón), o usar el flujo Excel manual (descargar →
   corregir → cargar) desde la pestaña Catálogo — ambos sincronizan con todo el equipo.
2. Para cambiar el catálogo de referencia/semilla (`CATALOGO_BASE`): editar
   `src/data/catalogo.ts` y opcionalmente correr **Restaurar catálogo original** para que
   el cambio también se refleje en el catálogo compartido.
3. Las filas de plantilla por defecto de Cubicación/Gestión están en
   `src/data/plantilla.ts`.

El catálogo realmente usado por la app en cada momento vive en `CatalogContext`
(`src/CatalogContext.tsx`, sincronizado con Supabase + Realtime) y se accede con el hook
`useCatalog()` — todos los componentes que necesitan tasas (`CascadaSelector`,
`TablaCubicacion`, `PanelCatalogo`, `calc.ts`) lo reciben como parámetro/prop en vez de
importar `CATALOGO_BASE` directamente.

La librería usada para leer/escribir `.xlsx` es `xlsx` (SheetJS), instalada **desde el CDN
oficial de SheetJS** (`https://cdn.sheetjs.com/...`) en vez del registro de npm — la
versión publicada en npm (0.18.5) tiene vulnerabilidades conocidas sin parche
(prototype pollution + ReDoS) que SheetJS solo corrige en su propio CDN. Si se actualiza
esta dependencia, mantener ese mismo canal de instalación, no `npm install xlsx` a secas.
Se carga con `import()` dinámico (no en el bundle principal) porque pesa ~500 KB — solo se
descarga cuando alguien abre la pestaña Catálogo y usa descargar/cargar.

## Notas de interfaz

- El `<header>` es `position: sticky` (siempre visible el total HH) y la barra de tabs
  se pega justo debajo usando la variable CSS `--header-h`, que `App.tsx` mantiene
  actualizada con un `ResizeObserver` sobre el header (no un valor fijo en px) — si se
  edita el layout del header y su alto cambia según el contenido, la barra de tabs se
  sigue acomodando sola.
- La tabla de Cubicación usa la clase `tabla--fija-primera` para fijar la columna
  "Tarea" con `position: sticky; left: 0` mientras se hace scroll horizontal (la tabla
  tiene 10 columnas y no siempre entra en una pantalla).
- El pill ámbar de "Pendiente de catalogar" es intencional (no rojo): es el estado
  normal de una fila de plantilla sin insumo todavía, no un error.
- El pie de la app muestra un **build id** (`src/buildInfo.ts`, constante `BUILD_ID`)
  con la fecha del último cambio de producto notable — bump manual, sin versionado
  semver ni CI que lo genere; sirve para confirmar a simple vista que el sitio publicado
  corresponde al build esperado.

## Estructura

```
src/
  types.ts               tipos compartidos (RecursoCatalogo, ProduccionRow, GestionRow…)
  calc.ts                 fórmulas de cálculo (factor, HH por fila, resumen/totales)
  format.ts               formato numérico es-CL
  supabaseClient.ts        cliente de Supabase + supabaseConfigurado (fallback seguro)
  AccessGate.tsx           login (Supabase Auth) — bloquea toda la app hasta iniciar sesión
  AccessGate.css           estilos de la pantalla de acceso
  CatalogContext.tsx       catálogo compartido (Supabase + Realtime + auto-sync SharePoint),
                          con CATALOGO_BASE como respaldo de solo lectura si Supabase no responde
  excelCatalogo.ts         export/import del catálogo en .xlsx + fetch a SharePoint (carga diferida de xlsx)
  catalogoSharePoint.ts    logica pura de la sync (URL, timing 12h, resguardo de tamaño) — sin xlsx,
                          se importa estatico; ver por que en el comentario del archivo
  data/catalogo.ts         CATALOGO_BASE: catálogo de referencia/semilla incorporado en el código
  data/plantilla.ts        filas por defecto de Gestión y Cubicación
  components/             CascadaSelector, TablaGestion, TablaCubicacion, PanelCatalogo,
                          PanelResumen, PanelParametros
  App.tsx                  estado de Cubicación/Gestión + persistencia en localStorage
supabase/
  migracion_inicial.sql    esquema + políticas RLS + datos semilla para Supabase
worker-catalogo/
  src/index.ts             Cloudflare Worker: proxy+cache del .xlsx de SharePoint (ver su README.md)
```
