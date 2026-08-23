# VALIDAR — Importar Cubicación desde Excel (2026-08-23)

Rama: `claude/import-excel-20260823` (commit `78d26b1`, sobre `main` actualizado en
`abc39c0`). Sin push, sin merge — Matías decide.

## Qué se pidió

"agrega en la cubicación, una carga de excel de cubicación... el mismo excel que se
descarga que se pueda cargar para actualizar" — importación inversa del export existente
(`exportCubicacion.ts`), con validación de estructura, preview antes de aplicar, reporte
de filas rechazadas, cuidado con redondeos/formatos, y estados de carga/éxito/error del
sistema de diseño v1.1.

## Nota sobre el punto de partida

Otra sesión había dejado un borrador **sin commitear** directo sobre `main` (botón de
importar + `importCubicacion.ts` básico). Al crear la rama nueva desde ese `main` con
cambios sin guardar, el working tree volvió a su estado limpio y el borrador se perdió
— no había nada que recuperar en git (`git stash list` y `git reflog` no muestran
rastro). Ya había leído el contenido completo del borrador antes de que esto pasara, así
que se reconstruyó desde cero incorporando mejoras que de todos modos correspondían al
encargo completo (el borrador no tenía validación de columnas, no distinguía filas
rechazadas de avisos, no mostraba preview de nuevas/cambiadas antes de aplicar, y usaba
`window.alert()` en vez del sistema de diseño). Ningún archivo del repo se dañó — el
borrador nunca llegó a un commit.

## Qué se implementó

**`src/importCubicacion.ts`** (nuevo) — núcleo de parseo y validación:
- `procesarLibroCubicacion(buffer, catalogo)` separado de `leerCubicacionExcel(archivo,
  catalogo)` (que solo hace `archivo.arrayBuffer()` y delega) — permite testear con un
  `ArrayBuffer` armado en memoria, sin necesitar `File`/DOM en los tests.
- **Estructura antes que datos**: valida que existan las 3 hojas (Parametros, Gestion,
  Cubicacion — "Resumen" es solo salida, no se lee) y que cada una tenga las columnas
  esperadas en el encabezado. Si algo no calza, lanza un error claro y **no procesa
  ninguna fila** — nunca hay una importación parcial silenciosa.
- **Ninguna fila se pierde en silencio**: una fila de Gestión sin "Cargo", o de
  Cubicación sin "Tarea" **ni** "Tipo / Recurso" (no aporta información), se omite y
  queda listada en `rechazadas` con hoja + número de fila de Excel + motivo. Todo lo
  demás se importa, corrigiendo a un valor por defecto lo que no calce (frecuencia o
  sección desconocida, número mal formado, recurso que ya no existe en el catálogo
  actual) y dejando un aviso en `avisos` — visible en el preview antes de aplicar.
- **Números**: acepta "4.5" y también "4,5" (coma decimal, formato es-CL que alguien
  editando el Excel a mano en Chile probablemente usa) y formatos con separador de
  miles; redondea a 4 decimales para no arrastrar artefactos de punto flotante ni marcar
  cambios falsos al comparar contra el estado actual.
- `compararProduccion`/`compararGestion`: cuentan nuevas/cambiadas/sin cambios/eliminadas
  emparejando por Sección+Tarea (Cubicación) o Cargo (Gestión) — no hay un id estable
  entre lo exportado y lo reimportado, así que el conteo es por contenido, no exacto en
  el caso límite de varias filas en blanco o con el mismo nombre en la misma sección
  (no afecta la importación en sí, solo la precisión del resumen previo).

**`src/calc.ts`**: se extrajo `etiquetaCompleta()` (ya la usaba `calcularProduccion` para
la columna "Tipo / Recurso" del export) para que el import resuelva la misma etiqueta de
vuelta a un `recursoId` sin duplicar el formato de la cadena en dos archivos distintos —
evita que un cambio futuro en el separador " — " rompa el import sin que nadie lo note.

**`src/components/PanelParametros.tsx`**: dueño de todo el flujo (elegir archivo →
parsear → preview → confirmar → aplicar), tan autocontenido como `PanelCatalogo.tsx` —
usa `useCatalog()`/`useConfirm()` directo en vez de recibir más props desde `App.tsx`.
Botón "⬆ Importar desde Excel" junto al de exportar. Estados de carga ("Leyendo…", botón
deshabilitado), éxito y error con el mismo patrón `role="status"/"alert"` +
`panel__hint--ok/aviso` que ya usa `PanelCatalogo` — nada de `window.alert()`.

**`src/ConfirmModal.tsx`/`.css`**: el mensaje pasa de `string` a `ReactNode`
(retrocompatible con los usos existentes) para poder mostrar el preview con listas, no
solo texto plano — el contenedor pasa de `<p>` a `<div>` (un `<ul>` dentro de `<p>` es
HTML inválido) y gana scroll propio (`max-height` + `overflow-y`) por si el preview trae
muchos avisos/rechazadas.

**Preview antes de aplicar** (dentro del `ConfirmModal`): "Cubicación: 3 nueva(s), 1
cambiada(s), 5 sin cambios, 2 se eliminarán." + lo mismo para Gestión, más el detalle de
filas rechazadas y avisos (hasta 6 de cada uno, con "… y N más." si hay más). Solo se
aplica si el usuario confirma.

**Rendimiento — bundle**: `importCubicacion.ts` importa `xlsx` (~500 KB), y el proyecto
ya tiene la convención documentada en el README de cargarlo solo con `import()` dinámico
(no en el bundle principal). El primer intento de este commit importaba el módulo
estático desde `PanelParametros.tsx` y el build lo delató: el chunk principal subió de
452 KB a 948 KB porque se llevó `xlsx` con él. Corregido con `import type` para los
tipos + `await import('../importCubicacion')` recién al elegir un archivo — verificado
en el output de `npm run build` que `xlsx` volvió a su chunk propio.

## Qué se descartó y por qué

- **Merge parcial (agregar solo lo nuevo, no reemplazar todo)**: el pedido original dice
  "cargar para actualizar", y el patrón ya establecido en `PanelCatalogo.tsx` para el
  catálogo es reemplazo completo con preview+confirmación, no merge campo por campo. Sin
  un id estable entre export/import, un merge real sería ambiguo (¿qué fila "es" cuál si
  cambiás el nombre de la tarea?). El preview de nuevas/cambiadas/eliminadas compensa la
  falta de merge dejando ver el efecto antes de aplicar.
- **Preservar qué etapas estaban activas/desactivadas al exportar**: no es una columna
  del Excel (es un toggle puramente local de la UI, nunca se serializó). Al reimportar,
  todas las etapas presentes nacen activas — mismo criterio que ya usa "Restaurar
  plantilla" para el mismo caso.

## Cómo verificar (< 10 min)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3          # debe mostrar 78d26b1 en claude/import-excel-20260823
npm test                       # vitest run — 17/17 logica de parseo/validacion/diff
npm run build                  # tsc + vite; revisar que "xlsx" siga en su propio chunk
npm run lint                   # oxlint, mismos 3 warnings preexistentes, 0 nuevos
npm run dev                    # abrir http://localhost:5173, iniciar sesion real
```

Con sesión real: en "Parámetros del proyecto", exportar un Excel, editarlo (cambiar una
cantidad, borrar una fila, agregar una fila, poner una frecuencia inventada en otra),
"Importar desde Excel" ese mismo archivo y confirmar que el preview muestra los conteos
esperados y las advertencias correctas antes de aplicar.

## Pendiente / requiere decisión de Matías

- **No se pudo probar el flujo completo en el navegador** (elegir archivo → preview →
  aplicar) por no contar con la clave de equipo real del `AccessGate` en este entorno —
  se verificó sin regresiones que el login sigue funcionando, y toda la lógica de
  parseo/validación/diff vía los 17 tests unitarios, pero el recorrido de UI real (clic
  en el botón, diálogo de confirmación, banner de resultado) queda por probar con sesión
  real antes de dar por cerrado del todo.
- **Merge/push**: rama lista, sin mergear ni pushear (regla del encargo).
- El borrador perdido de la sesión anterior no dejó nada pendiente de recuperar — quedó
  íntegramente reconstruido (y mejorado) en este commit.
