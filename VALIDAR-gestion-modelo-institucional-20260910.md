# VALIDAR — Gestión base según el modelo de estimación institucional (10-09-2026)

Rama: `claude/gestion-modelo-institucional-20260910` (basada en `main` = `11c8838`).

## Qué cambió

Los 7 cargos base de Gestión pasaron de porcentajes fijados a ojo el 27-08-2026 a los
del modelo `MODELO_ESTIMACION_v02.00.xlsx` (cubicación validada por la Gerencia de
Operaciones), y ahora se ajustan por la duración del proyecto.

**1. Porcentajes nuevos** (`src/data/plantilla.ts`, `CARGOS_BASE_GESTION`) — cada uno es
las HH del rol en el modelo ÷ **3.500 HH** del proyecto de referencia (16 semanas):

| Cargo | HH del modelo | antes | ahora |
|---|--:|--:|--:|
| Gestion JP | 108,75 | 30 % | **3,107 %** |
| Gestion DI Senior | 161,25 | 20 % | **4,607 %** |
| Gestion DG Senior | 56,25 | 5 % | **1,607 %** |
| Gestion Sop Senior | 56,25 | 5 % | **1,607 %** |
| Gestion DI TL | 39,375 | 5 % | **1,125 %** |
| Gestion DG TL | 30 | 5 % | **0,857 %** |
| Gestion Sop TL | 30 | 5 % | **0,857 %** |
| **Total** | **481,875** | **75 %** | **13,767 %** |

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
Gestión (`TablaGestion`, que muestra el factor vigente del proyecto) y en el `README.md`.

**4. `BUILD_ID`** `2026-08-28` → `2026-09-10` (`src/buildInfo.ts`), visible en el pie.

## Reconstrucción del proyecto de referencia (3.500 HH / 16 semanas)

Ejecutado contra el código real, no estimado:

```
  Gestion JP            3.107% x 1.00 =   108.745 HH   (modelo 108,75)
  Gestion DI Senior     4.607% x 1.00 =   161.245 HH   (modelo 161,25)
  Gestion DG Senior     1.607% x 1.00 =    56.245 HH   (modelo 56,25)
  Gestion Sop Senior    1.607% x 1.00 =    56.245 HH   (modelo 56,25)
  Gestion DI TL         1.125% x 1.00 =    39.375 HH   (modelo 39,375)
  Gestion DG TL         0.857% x 1.00 =    29.995 HH   (modelo 30)
  Gestion Sop TL        0.857% x 1.00 =    29.995 HH   (modelo 30)
  TOTAL                13.767%            481.845 HH   (modelo 481,875)
```

Diferencia total: **0,03 HH (0,006 %)**, íntegramente por redondear los 7 porcentajes a
tres decimales.

## Casos de verificación pedidos

| Caso | Factor | Calculado | Esperado | Δ |
|---|--:|--:|--:|--:|
| 3.500 HH / 16 sem | 1,0000 | **481,85** | 481,9 | −0,05 |
| 7.000 HH / 16 sem | 1,0000 | **963,69** | 963,8 | −0,11 |
| 3.500 HH / 32 sem | 1,4400 | **693,86** | 691,9 | +1,96 |
| 3.500 HH / 8 sem | 0,7800 | **375,84** | 376,9 | −1,06 |

Los dos primeros calzan dentro del redondeo. **Los dos últimos no**: los valores
esperados 691,9 y 376,9 no son 481,9 × 1,44 ni 481,9 × 0,78 (que dan 693,9 y 375,9). La
fórmula es la que manda, así que quedó implementada la fórmula y los tests fijan sus
resultados. Si 691,9 / 376,9 salieron de otra parte del modelo, hay que revisar la
fórmula del factor — avisar y se corrige.

## Impacto real (plantilla por defecto, medido contra el código)

| Semanas | Producción | Gestión ANTES (75 %) | Gestión AHORA | Total ANTES | Total AHORA |
|--:|--:|--:|--:|--:|--:|
| 4 | 114,70 | 86,03 | **10,58** | 200,73 | **125,28** |
| 8 | 221,90 | 166,43 | **23,83** | 388,33 | **245,73** |
| 16 | 436,30 | 327,23 | **60,07** | 763,53 | **496,37** |
| 32 | 865,10 | 648,83 | **171,50** | 1.513,93 | **1.036,60** |

**Toda cubicación existente baja de número.** En proyectos cortos baja más que el
13,77/75 que sugieren los porcentajes solos, porque el factor de duración se multiplica
encima (a 4 semanas vale 0,67).

## Cómo verificarlo en <10 min

```bash
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
npm run test    # 80/80
npm run build   # tsc -b && vite build, sin errores
npm run dev     # http://localhost:5173
```

En la app (requiere la clave de acceso del equipo):

1. N° de semanas = **16** y una cubicación de **3.500 HH** de producción → Gestión
   **481,85 HH**, y el factor mostrado en la ayuda de Gestión debe decir **1**.
2. Cambiar a **32** semanas: el total de Gestión sube exactamente **44 %** (factor 1,44).
   A **8** semanas baja a **78 %** (factor 0,78).
3. El pie de página debe decir **build 2026-09-10**.
4. Exportar a Excel: en la hoja `Gestion`, la columna `Factor` de los cargos base trae el
   factor de duración (no 1), y `Total HH` = `% proyecto` × producción × Factor.

Tests que fijan lo anterior, en `src/calc.test.ts`:
`factorDuracionGestion — ajuste por duracion del proyecto`,
`calcularGestion — el factor de duracion aplica SOLO a los cargos base`,
`Gestion base — casos de prueba del encargo`, más la salvaguarda
`los 7 cargos base suman ~13,77 % de la produccion, no el 75 % del modelo anterior`,
que falla si alguien devuelve los porcentajes viejos.

## Cómo revertir

Ya está mergeado y desplegado en `main`:

```bash
git revert -m 1 <sha del merge>
git push origin main      # el deploy se rehace solo
```

El `localStorage` de cada persona **no** conserva los porcentajes:
`reconciliarGestionBase` los fuerza desde el código en cada carga, así que revertir el
código revierte también las cubicaciones abiertas.

## Qué resultó falso de la premisa

1. **Los casos de 32 y 8 semanas no cuadran con la fórmula** (ver tabla arriba): 691,9 y
   376,9 contra 693,86 y 375,84 calculados. No es redondeo — son ~2 y ~1 HH. La fórmula
   `0,56 + 0,44 × (semanas ÷ 16)` se implementó tal cual se especificó.
2. **El total es 13,767 %, no 13,768 %.** El ratio exacto es 13,7679 %, pero los siete
   porcentajes redondeados a tres decimales suman 13,767 %. El texto de la app dice
   **13,77 %**.
3. **No había valores viejos hardcodeados en otro archivo**: los porcentajes vivían solo
   en `CARGOS_BASE_GESTION`. Sí había tres tests que los repetían como valores esperados
   (`calc.test.ts` ×2, `importCubicacion.test.ts` ×1) — actualizados. `reconciliarGestionBase`
   quedó consistente: fuerza los nuevos valores en cada carga de `localStorage` y en cada
   importación de Excel (test `fuerza el tipo/porcentaje del codigo aunque la fila traiga
   otro valor`).
4. **No se pudo leer `MODELO_ESTIMACION_v02.00.xlsx`**: no está en el disco. En el
   repositorio de Operaciones (`002_Gestion\002_Modelo_Operacion\220_Modelo_Estimacion\`)
   solo hay `EJEMPLO_MODELO_CUBICACION_v01.xlsx` y `v02.xlsx`, con otros totales (3.992
   HH: DI 2.884, DG 496, QA 484, JP+GE 128) y la hoja SUPUESTOS en blanco. Las cifras del
   modelo se tomaron como dadas, sin contrastarlas contra el archivo.

## Pendientes / cuidados

- **No se verificó la app en el navegador**: está detrás de la clave de acceso compartida
  del equipo y no corresponde que un agente autentique. La verificación fue por tests
  (80/80), `tsc --noEmit`, `npm run build` y los cálculos de arriba ejecutados contra el
  código real. Los puntos 1-4 de "Cómo verificarlo" quedan para Matías.
- El repo no tiene tests de UI (vitest corre en `environment: 'node'`, sin jsdom), así que
  el texto nuevo de `PanelInstrucciones`/`TablaGestion` está cubierto solo por compilación.
- Hay **otro trabajo pendiente sin mergear** en este repo, ajeno a este cambio: la rama
  `claude/usabilidad-3-revisores` (2 commits) más cambios sin commitear (renombre de
  `EstadoFila` de `OK` a `PENDIENTE DE VALIDAR`, con su
  `VALIDAR-estado-pendiente-validar-20260831.md`), respaldados en
  `Calculadora\backups\pendiente-usabilidad-3-revisores.patch.*.bak`. **Tocan `calc.ts` y
  `calc.test.ts`, igual que este trabajo: al mergear esa rama va a haber conflicto**
  textual en el `import` de `calc.test.ts` y alrededor de `EstadoFila`/`recursosOk`.
  Ninguno de los dos cambios toca la lógica del otro.
