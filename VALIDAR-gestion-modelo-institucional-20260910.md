# VALIDAR — Gestión base según el modelo de estimación institucional (10-09-2026)

Rama: `claude/gestion-modelo-institucional-20260910` (basada en `main` = `11c8838`).
**Sin merge ni push todavía** — decide Matías (ver "Cómo desplegar").

## Qué cambió

Los 7 cargos base de Gestión pasaron de porcentajes fijados a ojo el 27-08-2026 a los
del modelo `MODELO_ESTIMACION_v02.00.xlsx`, y ahora se ajustan por la duración del
proyecto.

**1. Porcentajes nuevos** (`src/data/plantilla.ts`, `CARGOS_BASE_GESTION`) — cada uno es
las HH del rol en el modelo ÷ 3.121,61 HH de trabajo productivo de su proyecto de
referencia:

| Cargo | HH del modelo | antes | ahora |
|---|--:|--:|--:|
| Gestion JP | 108,75 | 30 % | **3,48 %** |
| Gestion DI Senior | 161,25 | 20 % | **5,17 %** |
| Gestion DG Senior | 56,25 | 5 % | **1,80 %** |
| Gestion Sop Senior | 56,25 | 5 % | **1,80 %** |
| Gestion DI TL | 39,375 | 5 % | **1,26 %** |
| Gestion DG TL | 30 | 5 % | **0,96 %** |
| Gestion Sop TL | 30 | 5 % | **0,96 %** |
| **Total** | **481,875** | **75 %** | **15,43 %** |

**2. Factor de duración** (`src/calc.ts`, `factorDuracionGestion`). La fórmula era ciega
al calendario: 8 o 32 semanas pedían las mismas horas de jefatura. Ahora:

```
Factor_duración = 0,56 + 0,44 × (semanas ÷ 16)
HH_gestión(cargo) = %_cargo × HH_producción × Factor_duración
```

Usa el mismo N° de semanas que ya usa el Factor de las filas "Por semana" — no pide un
dato nuevo. Aplica **solo a los 7 cargos base**; un cargo % agregado a mano sigue siendo
un % plano (su porcentaje lo escribió quien cubica para ese proyecto, con su duración ya
en mente). Piso 0,56 si las semanas son 0, negativas o no numéricas.

**3. Texto explicativo** al final de las Instrucciones de la app (`PanelInstrucciones`,
punto 5, con estilo `.panel__formula` nuevo en `App.css`), en la ayuda de la tabla de
Gestión (`TablaGestion`, que ahora muestra el factor vigente del proyecto) y en el
`README.md`.

**4. `BUILD_ID`** `2026-08-28` → `2026-09-10` (`src/buildInfo.ts`), visible en el pie.

## Impacto real (plantilla por defecto, medido contra el código, no estimado)

| Semanas | Producción | Gestión ANTES | Gestión AHORA | Total ANTES | Total AHORA |
|--:|--:|--:|--:|--:|--:|
| 4 | 114,70 | 86,03 | **11,86** (13,8 %) | 200,73 | **126,56** |
| 8 | 221,90 | 166,43 | **26,71** (16,0 %) | 388,33 | **248,61** |
| 16 | 436,30 | 327,23 | **67,32** (20,6 %) | 763,53 | **503,62** |
| 32 | 865,10 | 648,83 | **192,22** (29,6 %) | 1.513,93 | **1.057,32** |

**Toda cubicación existente baja de número.** En proyectos cortos baja más que el
15,43/75 que sugieren los porcentajes solos, porque el factor de duración se multiplica
encima (a 4 semanas vale 0,67). **Antes de desplegar: revisar si hay una propuesta
comercial viva armada con los valores viejos.**

## Cómo verificarlo en <10 min

```bash
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
npm run test    # 80/80 — 16 tests nuevos sobre el factor y los porcentajes
npm run build   # tsc -b && vite build, sin errores
npm run dev     # http://localhost:5173
```

En la app (requiere la clave de acceso del equipo):

1. Parámetros: N° de semanas = **16**. En Gestión, el factor mostrado en la ayuda debe
   decir **1** y cada cargo base debe salir exactamente en su porcentaje.
2. Cambiar a **32** semanas: el total de Gestión debe subir exactamente **44 %**
   (factor 1,44). A **8** semanas debe bajar a **78 %** (factor 0,78).
3. El pie de página debe decir **build 2026-09-10**.
4. Exportar a Excel: en la hoja `Gestion`, la columna `Factor` de los cargos base debe
   traer el factor de duración (no 1), y `Total HH` = `% proyecto` × producción × Factor.

Tests que fijan lo anterior, en `src/calc.test.ts`:
`factorDuracionGestion — ajuste por duracion del proyecto`,
`calcularGestion — el factor de duracion aplica SOLO a los cargos base`,
`Gestion base — casos de prueba del encargo`, más la salvaguarda
`los 7 cargos base suman ~15,43 % de la produccion, no el 75 % del modelo anterior`,
que falla si alguien devuelve los porcentajes viejos.

## Cómo revertir

```bash
git checkout main          # la rama no está mergeada: main sigue con los valores viejos
git branch -D claude/gestion-modelo-institucional-20260910
```

Si ya se mergeó y desplegó: `git revert -m 1 <sha del merge>` y push a `main` (el deploy
se rehace solo). El estado guardado en `localStorage` de cada persona **no** conserva los
porcentajes: `reconciliarGestionBase` los fuerza desde el código en cada carga, así que
revertir el código revierte también las cubicaciones abiertas.

## Cómo desplegar (lo hace Matías)

```bash
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git checkout main
git merge --no-ff claude/gestion-modelo-institucional-20260910
git push origin main      # esto dispara el deploy a GitHub Pages (.github/workflows/deploy.yml)
```

El workflow corre `npm ci` y `npm run build` — **no corre los tests**. Conviene correr
`npm run test` antes del push.

## Qué resultó falso de la premisa del encargo

1. **Los casos de prueba anclados en "3.500 HH de producción" no cuadran con los
   porcentajes.** Los porcentajes se derivaron dividiendo por **3.121,61** HH de trabajo
   productivo, no por las 3.500 HH nominales del proyecto (que incluyen la gestión
   misma). Entonces las ~481,9 HH de gestión corresponden a **3.121,61** HH de
   producción, no a 3.500. Con 3.500 HH de producción la app da **540,05 HH**, que es lo
   correcto para una cubicación más grande. Los tests quedaron anclados en 3.121,61 HH.
   Lo que sí se cumple exacto es todo lo demás del encargo: factor 1,00 a 16 semanas,
   proporcionalidad con la producción (el doble de HH → el doble de gestión), 1,44 a 32
   semanas y 0,78 a 8 semanas.
2. **El total es 15,43 %, no 15,44 %.** El ratio exacto del modelo es 15,4367 %, que
   redondea a 15,44 %; pero los 7 porcentajes se redondean individualmente a dos
   decimales y suman 15,43 %. Son ~0,2 HH de diferencia sobre el proyecto de referencia.
   El texto de la app dice **15,43 %**, que es lo que la app efectivamente calcula.
   Los otros números derivados del encargo también arrastraban ese redondeo (691,9 y
   376,9 HH; con el factor exacto son 693,6 y 375,7).
3. **No había "otro lugar del código con los valores viejos hardcodeados"**, como pedía
   revisar el encargo: los porcentajes vivían solo en `CARGOS_BASE_GESTION`. Sí había
   tres tests que los repetían como valores esperados (`calc.test.ts` ×2,
   `importCubicacion.test.ts` ×1) — actualizados.

## Pendientes / cuidados

- **No se verificó la app en el navegador**: está detrás de la clave de acceso
  compartida del equipo y no corresponde que un agente autentique. La verificación fue
  por tests (80/80), `tsc --noEmit`, `npm run build` y el cálculo de impacto de arriba
  ejecutado contra el código real. Los puntos 1-4 de "Cómo verificarlo" quedan para
  Matías.
- El repo no tiene tests de UI (vitest corre en `environment: 'node'`, sin jsdom), así
  que el texto nuevo de `PanelInstrucciones`/`TablaGestion` está cubierto solo por
  compilación, no por test.
- Hay **otro trabajo pendiente sin mergear** en este repo, ajeno a este cambio: la rama
  `claude/usabilidad-3-revisores` (2 commits) más cambios sin commitear que estaban en
  el árbol al empezar (renombre de `EstadoFila` de `OK` a `PENDIENTE DE VALIDAR`, con su
  `VALIDAR-estado-pendiente-validar-20260831.md`). Se guardaron en `git stash` y se
  respaldaron en
  `Calculadora\backups\pendiente-usabilidad-3-revisores.patch.20260910-152410.bak`.
  **Esos cambios tocan `calc.ts` y `calc.test.ts`, igual que este trabajo: al mergear
  ambas ramas va a haber conflicto** en el `import` de `calc.test.ts` y alrededor de
  `EstadoFila`/`recursosOk` en `calc.ts`. Ninguno de los dos cambios toca la lógica del
  otro (uno es etiquetas de estado, el otro es la fórmula de gestión), así que el
  conflicto es textual, no de fondo.
