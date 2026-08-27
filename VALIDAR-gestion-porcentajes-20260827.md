# VALIDAR — Gestión por % del proyecto + elimina GE (2026-08-27)

Rama: `claude/gestion-porcentajes-20260827` (commit `ae2003d`, sobre `main` actualizado
en `9bdabdc`). **Push autorizado por este encargo — ya está en origin.** Merge y deploy
quedan para Matías (pasos al final).

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
   "+ Agregar cargo" también pueda ser de cualquiera de los dos tipos. No fue pedido
   explícitamente, pero es consistente con el resto de la app (todo es editable) y de
   bajo riesgo — fácil de quitar si Matías prefiere que el tipo quede fijo por cargo.

## Cómo verificar (< 10 min)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3          # debe mostrar ae2003d en claude/gestion-porcentajes-20260827
npm run build                  # tsc + vite, sin errores
npm run lint                   # oxlint, mismos 3 warnings preexistentes, 0 nuevos
npm test                       # vitest run — 29/29 (17 previos + 12 nuevos de este cambio)
npm run dev                    # abrir http://localhost:5173, iniciar sesion real
```

Con sesión real, en la pestaña Cubicación → sección "Gestión del proyecto": deben
aparecer los 7 cargos nuevos (JP, DI/DG/Sop Senior, DI/DG/Sop TL) con Tipo "% Proyecto",
sin GE, más "Bases Plantillas DG" (Fijo). Agregar o quitar un recurso en Cubicación y
confirmar que el Total HH de cada cargo porcentual cambia solo, sin recargar la página.
Exportar a Excel y confirmar que la hoja Gestión trae las columnas "Tipo" y "% proyecto".

## No se pudo verificar en vivo

Igual que en el resto de esta rama de trabajo: sin la clave real del equipo (Supabase
Auth) no pude entrar a la app en este entorno para probar visualmente la tabla de
Gestión con los cargos nuevos. Se verificó sin regresiones el login (con el build id
nuevo visible en el pie) y toda la lógica de cálculo/recálculo en vivo vía los 29 tests
unitarios — pero el recorrido de UI real (columna Tipo, inputs de %, tabla completa)
queda pendiente de una pasada visual con sesión real antes de darlo por cerrado del todo.

## Nota técnica aparte: byte nulo en importCubicacion.ts

Al editar `src/importCubicacion.ts` encontré un byte `0x00` incrustado en medio de un
template literal (entre `${r.seccion}` y `${r.tarea...}`, donde debía haber un espacio).
No es algo que TypeScript/el editor pueda producir escribiendo código normal — probable
artefacto de una escritura anterior a este archivo. Lo reescribí completo (mismo
contenido, sin el byte corrupto) y verifiqué con un script que ningún otro archivo
tocado en esta sesión tiene el mismo problema. Mencionarlo por si vuelve a aparecer en
otro archivo — no debería, pero vale la pena que quede registrado.

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

- Las 5 ambigüedades listadas arriba, en particular la definición de "total del
  proyecto" (punto 1) — es la más importante de confirmar, ya que si está mal toda la
  cubicación de Gestión calcularía sobre una base distinta a la esperada.
- Una pasada visual con sesión real antes de dar el flujo por completamente cerrado.
- Merge/push a `main` y deploy: quedan para Matías (comandos arriba).
