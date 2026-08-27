# VALIDAR — Gestión por % del proyecto + elimina GE (2026-08-27)

Rama: `claude/gestion-porcentajes-20260827`. **Push autorizado por este encargo — ya
está en origin.** Merge y deploy quedan para Matías (pasos al final).

**Nota de estado**: Matías ya mergeó y desplegó la entrega original (`ae2003d`/`960eb60`,
modelo Fijo/% Proyecto) y el primer ajuste (`5c4403d`, Gestión exclusivamente
porcentual) — confirmado porque `main`/`origin/main` llegaron a estar en `5c4403d` antes
de este segundo ajuste. Este documento queda en orden cronológico **inverso** (lo más
nuevo primero): leer el segundo ajuste primero, que es lo vigente.

## Segundo ajuste (27-08-2026, mismo día): los 7 cargos base quedan bloqueados a edición

Matías, viendo la tabla de Gestión ya con los 7 cargos porcentuales del primer ajuste:
*"corrige la calculadora para que vengan estos cargos con esos tiempos precargados y no
editables desde el usuario, solo los puedo editar yo desde el código... deja poder
agregar un nuevo cargo con porcentaje de gestión u horas... pero los cargos esos que
están en la imagen son los de base y van siempre en los proyectos, no hagas editable esa
parte."*

Esto **revierte parte del primer ajuste**: vuelve a existir la modalidad "Fijo" (Cantidad
× Frecuencia × HH unitaria), pero solo para cargos agregados a mano — los 7 base quedan
bloqueados, no para elegir entre Fijo/% Proyecto sino fijos en % Proyecto con el valor
del código.

- **`GestionRow` recupera `tipo`/`cantidad`/`frecuencia`/`hhUnitaria`** (el primer ajuste
  los había quitado) — `calcularGestion(rows, nSemanas, baseHH)` vuelve a 3 argumentos.
- **`CARGOS_BASE_GESTION`** (`data/plantilla.ts`), constante clara y comentada con los 7
  cargos base y su %, pensada para que Matías la edite directo si cambia un porcentaje o
  agrega/quita un cargo base — sin tocar el resto del código.
- **`reconciliarGestionBase(gestion)`**: el mecanismo real de bloqueo. Fuerza los 7
  cargos base a estar siempre presentes con el tipo/porcentaje de `CARGOS_BASE_GESTION`,
  **sin importar qué traiga `gestion`** para esos nombres — se aplica en 3 puntos:
  `gestionDefault()` (plantilla nueva / "Restaurar plantilla"), la migración de
  `localStorage` en `App.tsx`, y dentro de `procesarLibroCubicacion` (import de Excel,
  antes de que el preview le muestre nada al usuario). Esto es lo que hace el bloqueo
  real, no solo visual: un Excel editado a mano con otro % para "Gestion JP" se
  reimporta igual, pero el valor queda en 30% de todas formas.
- **Tabla de Gestión** (`TablaGestion.tsx`): fila base (`removable === false`) → Cargo,
  Tipo y % de solo lectura (`<span>`, no `<input>`/`<select>`), Cantidad/Frecuencia/HH
  unitarias en «—», sin botón «✕», con el interruptor Activa igual que antes (eso no se
  bloqueó — no fue pedido, y desactivar un cargo por proyecto sigue siendo útil). Fila
  agregada a mano (`removable === true`) → todo editable, con selector Tipo Fijo/%
  Proyecto que decide qué campos mostrar.
- **Excel**: la hoja Gestión recupera las columnas Tipo/Cantidad/Frecuencia/Factor/HH
  unitarias (quitadas en el primer ajuste). Un archivo que intente "editar" un cargo
  base se reimporta pisando ese intento (ver `reconciliarGestionBase` arriba).
- Tests reescritos: **40/40** (antes 33), con casos nuevos para `reconciliarGestionBase`
  (fuerza el valor del código, conserva rowId/activa existente, agrega cargos base
  ausentes, no toca cargos custom) y para el bloqueo end-to-end vía import de Excel.

### Ambigüedad que resolví con criterio — a validar por Matías

**El interruptor «Activa» de los 7 cargos base queda disponible** (se pueden
desactivar, no solo los agregados a mano). Matías dijo "no hagas editable esa parte"
refiriéndose a que él edita los tiempos/porcentajes solo desde el código — no dijo nada
sobre el interruptor de activar/desactivar, que es una función distinta y ya existía
desde antes de cualquiera de los dos ajustes. Interpreté que bloquear la edición del
*valor* no implica bloquear también la posibilidad de *desactivar* el cargo completo
para un proyecto puntual (ej. un curso sin equipo de Soporte). **Si Matías prefiere que
los 7 cargos base tampoco se puedan desactivar, es sacar el `<label
className="fila-toggle">` del branch `base` en `TablaGestion.tsx` — cambio de pocas
líneas.**

---

## Primer ajuste (27-08-2026, mismo día): Gestión queda solo en modo porcentaje

**Nota: este ajuste quedó parcialmente revertido por el segundo ajuste de arriba** — la
modalidad Fijo volvió a existir (para cargos agregados a mano). Lo que SÍ sigue vigente
de este primer ajuste: "Bases Plantillas DG" sigue eliminado (no es uno de los 7 base ni
algo que Matías haya pedido reintroducir), y GE sigue eliminado.

Pedido textual: *"Reemplaza esta parte para que calcule automático las horas de gestión
y que no hayan otras horas de gestión, pero sí se pueda agregar otro cargo... y que haya
un campo para agregar porcentaje."*

Se eliminó por completo la modalidad "Fijo" que traía la primera entrega — Gestión queda
exclusivamente en modo porcentaje:

- **`GestionRow` se simplifica** a `{ rowId, cargo, porcentaje, removable, activa }` — sin
  `tipo`, `cantidad`, `frecuencia` ni `hhUnitaria`. `calcularGestion(rows, baseHH)` ahora
  toma 2 argumentos (antes 3: ya no necesita `nSemanas`, no hay frecuencia que multiplicar).
- **"Bases Plantillas DG" se quitó** de `gestionDefault()` (era el único cargo Fijo,
  12 HH) — la ambigüedad #4 de la entrega anterior queda resuelta: ya no tiene cabida en
  el modelo. `gestionDefault()` trae ahora exactamente los 7 cargos porcentuales.
- **Tabla de Gestión simplificada**: columnas Cargo | % proyecto | Total HH | (activar/
  eliminar) — se quitaron Tipo, Cantidad, Frecuencia y HH unitarias por completo, no solo
  se ocultan.
- **"+ Agregar cargo" sigue disponible**: crea un cargo nuevo en 0%, con su propio campo
  de nombre y de porcentaje — responde directamente al "pero sí se pueda agregar otro
  cargo... y que haya un campo para agregar porcentaje" del pedido.
- **Los porcentajes de los 7 cargos por defecto quedan editables** (igual que antes del
  ajuste) — no fue pedido explícitamente pero es coherente con "campo para agregar
  porcentaje" aplicado también a los existentes, y con que el resto de la app es
  editable; de bajo riesgo. **Si Matías prefiere que los 7 por defecto queden fijos y
  solo lo agregado a mano sea editable, es acotar el `disabled` del input en
  `TablaGestion.tsx` — un cambio de una línea.**
- **Excel**: la hoja Gestión pierde las columnas Tipo/Cantidad/Frecuencia/HH
  unitarias/Factor — queda `Cargo | % proyecto | Total HH | Activa`. Un archivo
  exportado con el modelo anterior (con esas columnas, sin nada raro) ya no calza:
  **ahora es un error de estructura claro** ("faltan columnas: % proyecto"), no una
  importación silenciosa a 0% — porque migrar horas fijas a un porcentaje sin criterio
  de negocio sería inventar un dato, no importarlo. Reexportar desde la app resuelve.
- **Migración de `localStorage`**: quien ya tenía guardada la versión con Tipo
  Fijo/Porcentaje (poco probable — nunca llegó a producción real, solo a `main`)
  conserva sus cargos; los que eran "Fijo" pasan a 0% (sin horas que migrar
  automáticamente), los que ya eran "% Proyecto" conservan su valor. Ninguna fila
  desaparece sola.
- **Nota técnica**: al reeditar `src/importCubicacion.ts` volví a encontrarlo con
  bytes `0x00` incrustados (mismo síntoma que la nota al final de este documento, ver
  más abajo) — lo reescribí completo de nuevo y confirmé con un script que los 12
  archivos tocados en este ajuste no tienen el problema.

Tests: se reescribieron `calc.test.ts` e `importCubicacion.test.ts` para el modelo
nuevo (33/33 — antes 29). Build y lint limpios, mismos 3 warnings preexistentes.

---

## Entrega original (ya mergeada y desplegada) — commit `ae2003d`

## Qué se pidió (textual)

"agrega en la calculadora estos porcentajes para las horas de gestión sobre el total de
HH del proyecto: JP: 30%. Senior: DIS 20%, DGS 05%, SopS 05%. Jefes Área: DI TL 5%, DG TL
5%, Sop TL 5%. Que se calculen sobre el total de horas del proyecto y los recursos de la
parte superior, y saca el cargo de GE del proyecto... es el gestor, ya no va".

## Qué se implementó

1. **Modelo de dos tipos de cargo en Gestión** (`GestionRow.tipo: 'fijo' | 'porcentaje'`):
   - **Fijo** (el modelo de siempre): Cantidad × Factor(Frecuencia) × HH unitaria.
   - **% Proyecto** (nuevo): un porcentaje fijo del **total de HH de producción del
     proyecto** — la suma de HH DI+DG+SOP de Cubicación, solo etapas activas, por curso
     (`totalRecursosCurso` en `calc.ts`). No usa Cantidad/Frecuencia/HH unitaria.
2. **Los 7 cargos nuevos** (todos `% Proyecto`, reemplazando lo anterior): Gestión JP 30%,
   Gestión DI Senior 20%, Gestión DG Senior 5%, Gestión Sop Senior 5%, Gestión DI TL 5%,
   Gestión DG TL 5%, Gestión Sop TL 5%. "Bases Plantillas DG" (fijo, 12 HH) se mantuvo sin
   cambios — no estaba en el pedido.
3. **Cargo GE eliminado** de la plantilla por defecto (`gestionDefault()` en
   `data/plantilla.ts`) y de toda mención en la interfaz (Instrucciones, README).
4. **Recálculo en vivo**: cada cargo `% Proyecto` se recalcula automáticamente cuando
   cambia el total de producción (agregar/quitar recursos, cambiar cantidad, desactivar
   una etapa) — verificado con tests, no solo por inspección de código (ver más abajo).
5. **Desglose por cargo**: la tabla de Gestión sigue mostrando cada cargo en su propia
   fila con su Total HH — no se colapsó en un solo número.
6. **Excel** (export/import): la hoja Gestión suma columnas "Tipo" y "% proyecto". Un
   archivo exportado **antes** de este cambio (sin esas columnas) sigue importando sin
   error — todo cargo se trata como Fijo, verificado con test.
7. **Sistema de diseño v1.1 y footer**: sin tocar tokens/paleta. El footer se mantuvo y
   ganó un **build id** (ver más abajo).

## Ambigüedades que resolví con criterio — a validar por Matías

1. **Qué es "el total de horas del proyecto"** (para no ser circular): usé el total de
   HH de **producción** (Cubicación, etapas activas, por curso) — NO el total general
   que ya incluye Gestión, porque eso crearía una dependencia circular (Gestión % de un
   total que incluye a la propia Gestión). Leí "y los recursos de la parte superior"
   como la aclaración de Matías de que se refería justamente a eso — los recursos de
   Cubicación, que en la interfaz están arriba de la sección Gestión. **Si Matías quería
   otro total (ej. incluyendo Gestión fija tipo "Bases Plantillas DG"), es un cambio de
   una línea en `App.tsx` (qué se pasa como `baseGestionHH`).**
2. **Filas GE ya guardadas en el navegador de alguien**: como Cubicación vive en
   `localStorage` (no hay backend para eso, a diferencia del catálogo), un usuario que
   ya tenía una fila "Gestión GE" guardada **la conserva** — solo se quitó de la
   plantilla por defecto (proyectos nuevos, o "Restaurar plantilla"). No borré filas GE
   existentes automáticamente para no eliminar datos de alguien sin que lo pida
   explícitamente. **Si Matías prefiere que se purgue también de sesiones ya guardadas,
   es un cambio puntual en `estadoInicial()` (App.tsx) — lo puedo agregar.**
3. **"Actualiza build id"**: no existía ningún mecanismo de build id en el proyecto (sin
   CI, `package.json` en `0.0.0` desde el inicio, sin versionado semver establecido).
   Interpreté esto como "agrega y mantén actualizado un identificador visible del
   build" — implementé `src/buildInfo.ts` (constante `BUILD_ID`) mostrado en el pie:
   "· build 2026-08-27" (fecha del cambio, mismo criterio de fechado que el resto del
   ecosistema WeLearn). **Si Matías tenía en mente otro mecanismo (número de versión
   semver, hash de commit, algo de otra herramienta del ecosistema), decírmelo y lo
   ajusto** — el archivo es autocontenido y fácil de cambiar.
4. **Cargo "Bases Plantillas DG"**: no estaba en la lista de porcentajes que dio Matías
   ni en la instrucción de sacar GE — se mantuvo tal cual (fijo, 12 HH). Si en realidad
   también debía convertirse a algo o eliminarse, no lo hice porque no fue mencionado.
5. **Columna "Tipo" editable por el usuario**: agregué un selector Fijo/% Proyecto en
   cada fila de Gestión (no solo en las 7 nuevas) para que un cargo agregado a mano con
   "+ Agregar cargo" también pueda ser de cualquiera de los dos tipos. **Superada por el
   ajuste del mismo día**: Matías pidió que no exista otra modalidad de horas — la
   columna Tipo se eliminó por completo, ver arriba.

*(Ambigüedades #1, #2, #3 siguen vigentes tal cual — el ajuste no las tocó. #4 quedó
resuelta: "Bases Plantillas DG" se eliminó. #5 quedó resuelta al revés de lo que decía:
no hay Tipo que editar, todo cargo es porcentual.)*

## Cómo verificar (< 10 min) — estado actual (con los dos ajustes)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3          # tope de claude/gestion-porcentajes-20260827
npm run build                  # tsc + vite, sin errores
npm run lint                   # oxlint, mismos 3 warnings preexistentes, 0 nuevos
npm test                       # vitest run — 40/40
npm run dev                    # abrir http://localhost:5173, iniciar sesion real
```

Con sesión real, en la pestaña Cubicación → sección "Gestión del proyecto": deben
aparecer exactamente los 7 cargos base (JP, DI/DG/Sop Senior, DI/DG/Sop TL), sin GE y sin
"Bases Plantillas DG", cada uno **de solo lectura** (Cargo y % como texto plano, sin
input, sin botón «✕») salvo el interruptor Activa. Intentar tipear en el campo de
porcentaje de un cargo base no debe hacer nada (no hay input ahí). "+ Agregar cargo" debe
sumar una fila totalmente editable, con selector Tipo Fijo/% Proyecto que cambia qué
columnas se editan. Agregar o quitar un recurso en Cubicación y confirmar que el Total HH
de los cargos porcentuales (base y custom) cambia solo, sin recargar la página. Exportar
a Excel y confirmar que la hoja Gestión trae `Cargo | Tipo | Cantidad | Frecuencia |
Factor | HH unitarias | % proyecto | Total HH | Activa`. Editar a mano el % de "Gestion
JP" en ese Excel y reimportarlo: el preview y el resultado final deben mostrar igual 30%,
no el valor editado (bloqueo real, no solo de interfaz).

## No se pudo verificar en vivo

Igual que en el resto de esta rama de trabajo: sin la clave real del equipo (Supabase
Auth) no pude entrar a la app en este entorno para probar visualmente la tabla de
Gestión, en ninguno de los tres pasos (entrega original, primer ajuste, segundo ajuste).
Se verificó sin regresiones el login (con el build id visible en el pie) y toda la
lógica de cálculo/recálculo/bloqueo en vivo vía los 40 tests unitarios — pero el
recorrido de UI real (fila de solo lectura vs. editable, selector Tipo, reimportar un
Excel editado a mano) queda pendiente de una pasada visual con sesión real antes de
darlo por cerrado del todo.

## Nota técnica aparte: byte nulo en importCubicacion.ts (van dos veces confirmadas)

Al editar `src/importCubicacion.ts` por primera vez (entrega original) encontré un byte
`0x00` incrustado en medio de un template literal, donde debía haber un espacio — no es
algo que TypeScript/el editor produzcan escribiendo código normal. Lo reescribí completo
y verifiqué por script que ningún otro archivo tenía el mismo problema.

**Volvió a pasar en el primer ajuste**, mismo archivo, mismo síntoma — confirmado con el
mismo chequeo por script. En este segundo ajuste reescribí `importCubicacion.ts` de
nuevo (por la magnitud del cambio, no porque haya vuelto a verificar corrupción en el
archivo previo) y confirmé que la versión nueva quedó sin bytes nulos — pero esta vez no
puedo decir si el archivo tenía o no el problema antes de mi reescritura. Dos casos
confirmados en el mismo archivo, mismo día, siguen siendo sospechosos: si el síntoma
reaparece (acá o en otro archivo), vale la pena investigarlo en serio — revisar qué
proceso está tocando estos archivos entre sesiones (¿sync de OneDrive, un antivirus, el
propio editor?) en vez de seguir solo reescribiendo cuando aparece.

## Pasos de Matías para mergear y desplegar

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git fetch origin
git log --oneline main..origin/claude/gestion-porcentajes-20260827   # revisar el diff antes de mergear
git checkout main
git merge --ff-only origin/claude/gestion-porcentajes-20260827
git push origin main
```

El push a `main` dispara el workflow de GitHub Actions (`.github/workflows/deploy.yml`),
que reconstruye y publica `dist/` en GitHub Pages automáticamente — no hay un paso de
deploy manual aparte. Verificar en la pestaña "Actions" del repo que el build termine en
verde, y en el sitio publicado que el pie diga "· build 2026-08-27" (confirma que quedó
la versión esperada, no una build vieja cacheada).

## Pendiente / requiere decisión de Matías

- Las ambigüedades #1-3 de la entrega original siguen vigentes — en particular la
  definición de "total del proyecto" (#1) es la más importante de confirmar, ya que si
  está mal toda la cubicación de Gestión calcularía sobre una base distinta a la
  esperada. #4 y #5 quedaron resueltas por los ajustes.
- La ambigüedad del segundo ajuste (interruptor Activa de los 7 cargos base disponible o
  no) — ver esa sección arriba.
- Nota técnica del byte nulo repetido en `importCubicacion.ts` — si vuelve a pasar, vale
  la pena investigar la causa en vez de seguir reescribiendo.
- Una pasada visual con sesión real antes de dar el flujo por completamente cerrado.
- Merge/push a `main` (segunda vez, con el ajuste encima) y deploy: quedan para Matías
  (comandos arriba — el `git merge --ff-only` sigue siendo válido).
