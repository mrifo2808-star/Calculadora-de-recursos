# VALIDAR — Gestión por % del proyecto + elimina GE (2026-08-27)

Rama: `claude/gestion-porcentajes-20260827`. **Push autorizado por este encargo — ya
está en origin.** Merge y deploy quedan para Matías (pasos al final).

**Nota de estado**: Matías ya mergeó y desplegó la primera entrega de este documento
(commits `ae2003d`/`960eb60`, con el modelo de dos tipos Fijo/% Proyecto descrito más
abajo) — confirmado porque `main`/`origin/main` quedaron en `960eb60`. El mismo día pidió
un ajuste (ver sección siguiente) que esta rama ya trae encima, listo para un segundo
merge. El resto de este documento describe la entrega ORIGINAL tal cual se validó
entonces; leer primero el ajuste, que es lo vigente.

## Ajuste del mismo día (27-08-2026): Gestión queda solo en modo porcentaje

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

## Cómo verificar (< 10 min) — estado actual (con el ajuste)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3          # tope de claude/gestion-porcentajes-20260827
npm run build                  # tsc + vite, sin errores
npm run lint                   # oxlint, mismos 3 warnings preexistentes, 0 nuevos
npm test                       # vitest run — 33/33
npm run dev                    # abrir http://localhost:5173, iniciar sesion real
```

Con sesión real, en la pestaña Cubicación → sección "Gestión del proyecto": deben
aparecer exactamente los 7 cargos (JP, DI/DG/Sop Senior, DI/DG/Sop TL), sin GE y sin
"Bases Plantillas DG", cada uno con su % editable y sin columnas de Cantidad/Frecuencia/
HH unitarias/Tipo. Agregar o quitar un recurso en Cubicación y confirmar que el Total HH
de cada cargo cambia solo, sin recargar la página. "+ Agregar cargo" debe sumar una fila
en 0% con nombre y % editables. Exportar a Excel y confirmar que la hoja Gestión trae
`Cargo | % proyecto | Total HH | Activa` (sin Tipo/Cantidad/Frecuencia/HH unitarias).

## No se pudo verificar en vivo

Igual que en el resto de esta rama de trabajo: sin la clave real del equipo (Supabase
Auth) no pude entrar a la app en este entorno para probar visualmente la tabla de
Gestión con los cargos nuevos, ni antes ni después del ajuste. Se verificó sin
regresiones el login (con el build id visible en el pie) y toda la lógica de cálculo/
recálculo en vivo vía los 33 tests unitarios — pero el recorrido de UI real (tabla de
Gestión simplificada, "+ Agregar cargo") queda pendiente de una pasada visual con sesión
real antes de darlo por cerrado del todo.

## Nota técnica aparte: byte nulo en importCubicacion.ts (se repitió)

Al editar `src/importCubicacion.ts` encontré un byte `0x00` incrustado en medio de un
template literal (entre `${r.seccion}` y `${r.tarea...}`, donde debía haber un espacio).
No es algo que TypeScript/el editor pueda producir escribiendo código normal — probable
artefacto de una escritura anterior a este archivo. Lo reescribí completo (mismo
contenido, sin el byte corrupto) y verifiqué con un script que ningún otro archivo
tocado en esta sesión tiene el mismo problema.

**Volvió a pasar en el ajuste del mismo día** (mismo archivo, `importCubicacion.ts`, al
reescribirlo para el modelo exclusivamente porcentual) — mismo síntoma, mismo arreglo
(reescritura completa + verificación por script de los 12 archivos tocados). Dos veces
en el mismo archivo en el mismo día es sospechoso: si vuelve a aparecer una tercera vez
(en este archivo o en cualquier otro), vale la pena investigarlo en serio en vez de
seguir reescribiendo — podría ser el editor, un problema del entorno, u otra cosa.

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
  esperada. #4 y #5 quedaron resueltas por el ajuste (ver arriba).
- Si los 7 porcentajes por defecto deberían quedar fijos (no editables) — ver nota en
  la sección del ajuste.
- Una pasada visual con sesión real antes de dar el flujo por completamente cerrado.
- Merge/push a `main` (segunda vez, con el ajuste encima) y deploy: quedan para Matías
  (comandos arriba — el `git merge --ff-only` sigue siendo válido).
