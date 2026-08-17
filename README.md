# WeLearn — Calculadora de Recursos (web)

Calculadora web de horas DI / DG / SOP para proyectos de producción de cursos. Es la
versión web de `WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx` (veredicto APROBADO
RC7): mismo catálogo de tasas, mismo selector en cascada Tipo → Recurso, misma fórmula de
cálculo de horas y los mismos totales por sección, por curso y por proyecto.

Aplicación 100% cliente (sin backend): todo el cálculo ocurre en el navegador y el estado
se guarda solo en `localStorage` del propio navegador. No se envía ningún dato a un
servidor.

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

Los cargos de "Gestión del proyecto" (JP, GE, TLs, etc.) usan la misma fórmula de Factor,
pero no consumen el catálogo de recursos — su HH unitaria es editable directamente.

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

## Descargar / cargar el catálogo en Excel

En la pestaña "Catálogo" hay dos botones:

- **⬇ Descargar catálogo (Excel)** — exporta un `.xlsx` (hoja `Catalogo`) con las columnas
  Estado, Tipo, Nombre visible, Extensión, Unidad, DI/DG/SOP, ID técnico, Fuente,
  Observaciones.
- **⬆ Cargar catálogo actualizado (Excel)** — lee un `.xlsx` con esas mismas columnas y
  **reemplaza el catálogo activo en ese navegador** (persiste en `localStorage`, no hace
  falta recargar código). Filas sin `Tipo` o `Nombre visible` se descartan; filas con el
  mismo `ID tecnico` se fusionan (gana la última del archivo); si `ID tecnico` viene vacío
  se genera uno nuevo automáticamente. Aparece un botón **Restaurar catálogo original**
  para volver al catálogo incorporado en el código en cualquier momento.
- Este reemplazo es **local al navegador** de quien lo carga — no cambia el repositorio.
  Para que el cambio quede permanente para todos, alguien debe tomar el `.xlsx` corregido
  y trasladar esas filas a `CATALOGO_BASE` en `src/data/catalogo.ts` (a mano, o pidiéndole
  a Claude que lo haga a partir del archivo).

La librería usada para leer/escribir `.xlsx` es `xlsx` (SheetJS), instalada **desde el CDN
oficial de SheetJS** (`https://cdn.sheetjs.com/...`) en vez del registro de npm — la
versión publicada en npm (0.18.5) tiene vulnerabilidades conocidas sin parche
(prototype pollution + ReDoS) que SheetJS solo corrige en su propio CDN. Si se actualiza
esta dependencia, mantener ese mismo canal de instalación, no `npm install xlsx` a secas.
Se carga con `import()` dinámico (no en el bundle principal) porque pesa ~500 KB — solo se
descarga cuando alguien abre la pestaña Catálogo y usa descargar/cargar.

## Actualizar el catálogo de tasas (directo en el código)

El catálogo base vive en `CATALOGO_BASE` (`src/data/catalogo.ts`, un array plano, sin
build step de Excel):

1. Editar/agregar la fila correspondiente en `CATALOGO_BASE`.
2. Si el recurso pasa a `estado: 'Validado'`, aparece automáticamente en la cascada
   Tipo → Recurso (no requiere tocar ningún otro archivo).
3. Las filas de plantilla por defecto de Cubicación/Gestión están en
   `src/data/plantilla.ts`.

El catálogo realmente usado por la app en cada momento (`CATALOGO_BASE` o uno cargado
desde Excel) vive en `CatalogContext` (`src/CatalogContext.tsx`) y se accede con el hook
`useCatalog()` — todos los componentes que necesitan tasas (`CascadaSelector`,
`TablaCubicacion`, `PanelCatalogo`, `calc.ts`) lo reciben como parámetro/prop en vez de
importar `CATALOGO_BASE` directamente.

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

## Estructura

```
src/
  types.ts               tipos compartidos (RecursoCatalogo, ProduccionRow, GestionRow…)
  calc.ts                 fórmulas de cálculo (factor, HH por fila, resumen/totales)
  format.ts               formato numérico es-CL
  CatalogContext.tsx       catálogo activo (base o importado), persistido en localStorage
  excelCatalogo.ts         export/import del catálogo en .xlsx (carga diferida de xlsx)
  data/catalogo.ts         CATALOGO_BASE: catálogo incorporado en el código
  data/plantilla.ts        filas por defecto de Gestión y Cubicación
  components/             CascadaSelector, TablaGestion, TablaCubicacion, PanelCatalogo,
                          PanelResumen, PanelParametros
  App.tsx                  estado global + persistencia en localStorage
```
