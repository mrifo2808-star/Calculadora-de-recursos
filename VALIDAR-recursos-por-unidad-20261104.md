# VALIDAR — Recursos «por unidad» (04-11-2026)

Rama: `claude/recursos-por-unidad-20261104`, sobre `origin/main` = `1d3ceda`.
**Sin push, merge ni deploy** — decide Matías.

## El problema

El catálogo marca recursos que se cotizan **por unidad del curso** en la columna
**«Unidad» = `unidad`** (hoja `Catalogo` de `catalogo-welearn- v1 (5).xlsx`): 5 recursos,
2 de ellos Validados y por lo tanto seleccionables — «Video 2D» y «Capsula video
Docente»; los otros 3 («Actividad mínima obligatoria (AMO)», «Interactivo», «Plan de
Clase Estudiante (PCE)») están Pendientes. Los demás valores de esa columna son la unidad
de la extensión: `páginas`, `minutos`, `slides`, `preguntas`, `criterios`, `conceptos`.

El desplegable **Frecuencia** de Cubicación ya ofrecía **«Por unidad»**, pero no hacía
nada: `'Por unidad'` aparecía solo en el tipo `Frecuencia` y en el array `FRECUENCIAS`, y
`factorDe` lo mandaba al `: 1` final. No existía dónde declarar cuántas unidades tiene el
curso. Eso es exactamente lo que reportó Matías: la opción está en el catálogo y en el
desplegable, pero no se puede usar.

## Qué cambió

**1. Control nuevo en la parte superior** — campo **«N° unidades»** en Parámetros, entre
«N° semanas» y «Modalidad», numérico, mínimo 1, por defecto **1**.

**2. Cálculo** (`src/calc.ts`, `factorDe`): «Por unidad» pasa a devolver el N° de
unidades, igual que «Por semana» devuelve el N° de semanas.

```
Por semana → N° semanas
Por unidad → N° unidades      ← antes devolvía 1
Por curso / Fijo → 1
```

Se aplica a las filas de Cubicación y también a los cargos de Gestión tipo **fijo** (usan
la misma tabla de factores). Los cargos **%** no: su factor sigue siendo el de duración.

**3. Sin duplicar el efecto.** Quien multiplica es **solo** la Frecuencia de la fila. El
marcador del catálogo (`recursoEsPorUnidad`) es **informativo**: si eliges un recurso
marcado «por unidad» y dejas otra Frecuencia, la tabla muestra un **⚠ por unidad** junto
al selector, con el detalle al pasar el mouse. No corrige el cálculo solo — cambiarlo a
espaldas de quien cubica sería peor — y no multiplica por su cuenta, que es lo que
produciría el doble conteo.

**4. Persistencia.** `nUnidades` va en `ParametrosCurso`; un `localStorage` anterior, o
un valor corrupto (0, negativo, texto), cae a 1. El Excel exportado lleva la columna
**«N° unidades»** en Parámetros; al importar es opcional: si falta, 1.

**5. Instrucciones**, ayuda de Parámetros y de la tabla, y **`BUILD_ID`** `2026-09-10.2`
→ `2026-11-04`.

## Sin romper las fórmulas — verificado contra `origin/main`

No solo con tests internos: se calcularon los totales de la plantilla por defecto en un
worktree de `origin/main` y en esta rama, y se compararon.

```
cursos=1  semanas=4  | DI=41 DG=64.1 SOP=9.6 recursos=114.7 gestion=10.58 general=125.28
```

Snapshot de 65 líneas (3 combinaciones de cursos/semanas, subtotales por sección, los 7
cargos base con su % y factor, y el total fila a fila de la plantilla):
**diff vacío — idéntico byte a byte.**

**Las HH de JP siguen saliendo de la producción total**, con las unidades ya dentro:
`baseGestionHH = totalRecursosCurso(produccionCalc)` no cambió, así que si la producción
se triplica por las unidades, JP se triplica con ella. Hay un test que lo comprueba
(3,107 % y factor de duración intactos).

## Tests

**152/152** (`origin/main` estaba en 121). 31 nuevos:

- `calc.test.ts` — `factorDe` por frecuencia, N° de unidades inválido o negativo = 0,
  `recursoEsPorUnidad` con todas las unidades reales del catálogo, **la no-duplicación**
  (recurso marcado + «Por curso» da el mismo total con 1 que con 3 unidades),
  **unidades = 1 idéntico a la firma anterior** sobre una cubicación mixta, **caso con 3
  unidades** (14 → 42 HH, factor 3, solo la fila «Por unidad»), cargo de Gestión fijo
  «Por unidad», JP sobre la producción ya escalada, y la migración de parámetros.
- `components/TablaCubicacion.test.ts` — la ayuda dice cuántas unidades se aplican; el ⚠
  aparece con otra Frecuencia, no aparece si ya está en «Por unidad» ni en un recurso
  normal; 3 unidades muestran el triple de HH.
- `components/PanelParametros.test.ts` (**nuevo**) — el campo está en el panel superior,
  entre N° semanas y Modalidad, `type=number`, `min=1`, parte en 1, refleja el valor, y
  N° cursos / N° semanas quedan intactos.

`npx tsc -b` limpio, `npm run build` limpio, `oxlint` sin advertencias nuevas (siguen las
3 preexistentes de `react(only-export-components)`).

## Cómo revisarlo y desplegar

```bash
cd "C:\Users\matia\Downloads\Calculadora-de-recursos-rama"
git checkout claude/recursos-por-unidad-20261104
npm run test && npm run build
npm run dev        # http://localhost:5173
```

En la app: Parámetros → **N° unidades = 3**. En Cubicación, una fila con «Video 2D»
(marcado por unidad) en Frecuencia «Por curso» muestra el **⚠ por unidad**; al cambiarla a
«Por unidad» sus HH se triplican y el ⚠ desaparece. Con N° unidades = 1 todos los totales
vuelven a los de hoy. Pie de página: **build 2026-11-04**.

Merge y deploy (dispara GitHub Pages):

```bash
git checkout main
git merge --no-ff claude/recursos-por-unidad-20261104
npm run test              # el workflow de Pages NO corre tests
git push origin main
```

## Qué no se hizo / cuidados

- **No se verificó en el navegador**: la app está detrás de la clave de acceso compartida
  del equipo y no corresponde que un agente autentique. Lo cubren los tests de render, que
  verifican el HTML real del campo nuevo, del ⚠ y de los totales por fila.
- **Los 3 recursos «por unidad» que están Pendientes no son seleccionables** (la cascada
  solo ofrece Validados). Si Matías quiere usar «AMO», «Interactivo» o «PCE» hay que
  validarlos en el catálogo primero — es decisión suya, no de la calculadora.
- El N° de unidades es **uno por proyecto**, no por curso ni por sección: si distintos
  cursos del mismo proyecto tienen distinta cantidad de unidades, esto no lo representa.
  No se pidió y no se asumió.
- `PanelParametros.test.ts` sustituye con `vi.mock` los hooks `useCatalog` y `useConfirm`
  (sus Provider no se exportan y `CatalogProvider` sale a la red al montarse). Se prefirió
  eso antes que exportar los contextos solo para poder testear.
