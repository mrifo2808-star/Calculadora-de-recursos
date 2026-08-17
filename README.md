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

## Actualizar el catálogo de tasas

El catálogo vive en `src/data/catalogo.ts` (un array plano, sin build step de Excel). En
la pestaña "Catálogo" de la app hay un botón **Descargar catálogo (CSV)** que exporta la
tabla completa (Estado, Tipo, Nombre visible, Extensión, Unidad, DI/DG/SOP, Fuente,
Observaciones) para revisarla o corregirla fuera de la app (Excel/Sheets). Para incorporar
un cambio de tarifas después de corregir el CSV:

1. Editar/agregar la fila correspondiente en `CATALOGO` (`src/data/catalogo.ts`).
2. Si el recurso pasa a `estado: 'Validado'`, aparece automáticamente en la cascada
   Tipo → Recurso (no requiere tocar ningún otro archivo).
3. Las filas de plantilla por defecto de Cubicación/Gestión están en
   `src/data/plantilla.ts`.

## Estructura

```
src/
  types.ts              tipos compartidos (RecursoCatalogo, ProduccionRow, GestionRow…)
  calc.ts                fórmulas de cálculo (factor, HH por fila, resumen/totales)
  format.ts              formato numérico es-CL
  data/catalogo.ts        catálogo de recursos (tasas DI/DG/SOP)
  export.ts               generación de CSV para descargar el catálogo
  data/plantilla.ts       filas por defecto de Gestión y Cubicación
  components/            CascadaSelector, TablaGestion, TablaCubicacion, PanelCatalogo,
                          PanelResumen, PanelParametros
  App.tsx                 estado global + persistencia en localStorage
```
