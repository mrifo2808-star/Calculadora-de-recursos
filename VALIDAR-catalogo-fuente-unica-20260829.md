# VALIDAR — Catálogo: fuente única documentada (SharePoint/webapp manda)

Rama: `claude/catalogo-fuente-unica-20260829` (pusheada, no mergeada). Sobre `main` @
`11c8838` (ya incluye las dos entregas anteriores: retiro de carga manual + desplegable
de emergencia — Matías ya las había mergeado a `main` cuando arrancó este encargo).

## Qué pediste

> "manda la webapp, la que se sincroniza desde SharePoint." Encargo: (1) verificar
> cifras reales hoy (Worker/SharePoint, `catalogo.ts` local, Excel RC7); (2) documentar
> en README y/o CLAUDE.md de la Calculadora que la fuente única es el Excel de
> SharePoint sincronizado por la webapp, con fecha y razón; (3) si queda alguna copia en
> el código que pueda usarse por error como fuente, no borrarla sin avisar — decir qué
> se encontró y proponer qué hacer; (4) revisar que ninguna parte del código siga
> leyendo la fuente antigua como principal. Sin cambios funcionales más allá de eso.

## 1. Cifras verificadas hoy (2026-08-29)

| Fuente | Recursos | Cómo se midió |
|---|---|---|
| **Excel de SharePoint, vía el Worker en vivo** | **54** | `fetch()` directo a `https://welearn-catalogo-proxy.mrifo2808.workers.dev` (el endpoint público real, no un mock) + `XLSX.read` sobre la respuesta, contando filas de la hoja `Catalogo` con Tipo y Nombre visible |
| `webapp/src/data/catalogo.ts` (`CATALOGO_BASE`) | 47 | Conteo directo del array en el código |
| `WeLearn_Calculadora_Recursos_v1.3_RC7_EDITABLE.xlsx`, hoja `Catalogo_Tecnico` | 41 | Leído con el mismo parser `xlsx` que usa la webapp; coincide exactamente con el resumen que el propio Excel declara en su hoja `Catalogo` ("Total de recursos: 41") |

Detalle relevante que no esperaba: el catálogo de SharePoint **no es un superset** de
los otros dos. Trae **8 recursos nuevos** que no existen ni en `catalogo.ts` ni en RC7
(`Video de bienvenida`, `SCORM - Rise /Plantilla personalizada`, `Video de unidad`, `PDF
descargable`, `Resumen`, `Glosario`, `Cuestionario sumativo`, `Actividad formativa Rise
(Actividades)` — todos `Fuente = "Medios/Actividades a considerar por cada curso"`), y
reclasificó la mayoría de los recursos antiguos de `Validado` a `Pendiente` (solo 8 de
54 quedan `Validado` en SharePoint hoy). Eso confirma que alguien del equipo ya está
usando SharePoint activamente para curar el catálogo — es la fuente que de verdad se
mueve, las otras dos quedaron congeladas en fotos anteriores. Esto refuerza tu decisión,
no la cuestiona.

## 2. Documentación agregada

- **`webapp/README.md`**: nueva sección **"Fuente única del catálogo (decisión
  2026-08-29)"** — la tabla de cifras de arriba, la razón de la decisión (se actualiza
  sola, no depende de que alguien recuerde regenerar un Excel), y el estatus de RC7/
  `catalogo.ts` como material histórico. También corregí una frase que decía que el seed
  de Supabase eran "los 47 recursos vigentes" (ya no son vigentes, son el snapshot
  inicial).
- **`Calculadora/CLAUDE.md`** (un nivel arriba del repo git, así que no viaja en este
  commit — está en el filesystem del proyecto, respaldado en
  `Calculadora/backups/CLAUDE.md.20260829-230732.bak` antes de editar): agregué la
  sección **"Fuente única del catálogo de tasas (decisión de Matías, 2026-08-29)"** y
  corregí la frase "Replica fiel del Excel RC7 (mismo catálogo de 41 recursos)" que ya
  no era cierta. Aclaré que el pipeline Excel (`build_calculadora_RC*.ps1`) sigue
  existiendo para Cubicación/horas, pero su hoja de catálogo ya no es la referencia de
  tasas.
- **No toqué** el `CLAUDE.md` raíz del ecosistema (`WeLearn-Trabajo\CLAUDE.md`) — tiene
  una nota pendiente sobre "catálogo triplicado" que esta decisión resuelve
  parcialmente (queda zanjado cuál manda; la unificación en sí sigue siendo "proyecto
  aparte" como ya decía ese archivo). Avísame si quieres que actualice esa nota
  también — la dejé para no salirme del alcance que pediste (README y/o CLAUDE.md de la
  Calculadora).

## 3. Copias que pueden usarse por error como fuente — qué encontré y qué propongo

Encontré **dos**, ninguna borrada:

1. **`webapp/src/data/catalogo.ts`** (`CATALOGO_BASE`, 47 recursos). Reescribí su
   comentario de cabecera para que sea inequívoco: dice explícitamente "SNAPSHOT
   HISTÓRICO — NO es la fuente del catálogo", cita la decisión y fecha, y enumera los 3
   únicos usos legítimos que le quedan (placeholder de carga inicial, respaldo si
   Supabase no responde, contenido de "Restaurar catálogo original"). **No cambié los
   datos del array** — eso sería un cambio funcional (afecta qué trae la salida de
   emergencia) y me pediste no ir más allá de documentar. Ver nota abajo sobre esto.
2. **`webapp/supabase/migracion_inicial.sql`** (seed de 47 filas para levantar un
   proyecto Supabase nuevo desde cero). Le agregué un comentario equivalente al inicio:
   es un snapshot para bootstrap, no la fuente; la sincronización automática con
   SharePoint lo corrige solo en las primeras 12 h después de correr la migración.

No encontré ningún JSON de respaldo separado — busqué en todo `webapp/` (excluyendo
`node_modules`/`dist`) cualquier archivo con "catalog" en el nombre y solo aparecen los
`.ts`/`.tsx` de código, los `VALIDAR-*.md` y el propio `catalogo.ts`.

**Propuesta que no ejecuté (a tu criterio)**: `CATALOGO_BASE` sigue siendo el contenido
real de "Restaurar catálogo original" — si alguna vez se usa esa salida de emergencia,
hoy reemplazaría el catálogo compartido (54 recursos, activamente curado) por esta foto
de 47 recursos desactualizada, perdiendo los 8 recursos nuevos y las reclasificaciones
de estado. Eso ya era así antes de este encargo (no es algo que yo haya introducido),
pero ahora que quedó explícito cuál es la fuente real, me parece que vale la pena
decidir: ¿mantener `CATALOGO_BASE` congelado como "última versión conocida-buena antes
de que algo se rompiera" (su rol actual), o refrescarlo periódicamente para que la
salida de emergencia no quede tan desactualizada? Es un cambio de datos, no de
documentación, así que no lo hice sin que me lo pidas explícitamente.

## 4. Revisión: ¿algo lee `catalogo.ts` como fuente principal?

No. Tracé todos los usos de `CATALOGO_BASE` y de las funciones exportadas por
`catalogo.ts`:

- `CatalogContext.tsx` usa `CATALOGO_BASE` solo como: (a) valor inicial de `useState`
  antes de que Supabase responda, (b) lo que queda si Supabase falla al cargar, (c) el
  contenido que aplica "Restaurar catálogo original". Ningún cálculo real pasa por acá
  una vez que Supabase cargó.
- `calc.ts` y `CascadaSelector.tsx` importan las funciones **genéricas**
  `recursoPorId`/`etiquetaRecurso`/`recursosPorTipo`/`tiposDisponibles` de
  `catalogo.ts` — pero estas funciones reciben el catálogo como **parámetro**
  (`catalogo: RecursoCatalogo[]`), no leen `CATALOGO_BASE` internamente. Verifiqué que
  quien las llama (`App.tsx` vía `useCatalog().catalogo`) siempre pasa el catálogo
  **en vivo** de Supabase, nunca el snapshot estático.

O sea: la arquitectura ya estaba bien (nada calculaba con datos viejos por error); lo
que faltaba era que quedara **documentado y explícito**, que es lo que se hizo acá.

## Cómo verificar (< 5 min)

1. `git checkout claude/catalogo-fuente-unica-20260829`
2. Abrir `webapp/README.md` y `Calculadora/CLAUDE.md` — confirmar que ambos tienen la
   sección "Fuente única del catálogo" con la tabla de cifras y la fecha 2026-08-29.
3. Abrir `webapp/src/data/catalogo.ts` — confirmar que el comentario de cabecera dice
   "SNAPSHOT HISTÓRICO — NO es la fuente del catálogo" y que el array de datos **no
   cambió** (`git diff main -- webapp/src/data/catalogo.ts` solo debe mostrar el
   comentario).
4. `cd webapp && npm test -- --run` → 65/65. `npm run build` → sin errores (no se tocó
   ningún archivo de lógica, solo comentarios/docs).

## Pasos exactos para ti (cmd.exe)

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git fetch origin
git checkout main
git merge --no-ff origin/claude/catalogo-fuente-unica-20260829
git push origin main
```

## Cómo revertir
No se mergeó a `main` — si no la usas, simplemente no la mergees. Si ya la mergeaste:
`git revert <hash-del-merge>`.

## Pendiente / a tu criterio
1. **Decidir sobre `CATALOGO_BASE` desactualizado** (punto 3 arriba): dejarlo congelado
   como está, o refrescarlo para que "Restaurar catálogo original" no vuelva a un
   catálogo con 8 recursos menos que el real.
2. Si quieres que también actualice la nota "Catálogo triplicado" del `CLAUDE.md` raíz
   del ecosistema (`WeLearn-Trabajo\CLAUDE.md`), dímelo — no lo toqué por alcance.
3. Sigue sin resolver (fuera de este encargo): unificar de verdad las 3 implementaciones
   (dejar de mantener el pipeline Excel RC7 con su propio catálogo si ya no se usa como
   fuente) — es la parte de "proyecto aparte" que el `CLAUDE.md` raíz ya marcaba.

## Qué resultó falso de la premisa
- No asumí nada que resultara falso esta vez — los tres conteos (54/47/41) coinciden
  exactamente con lo que el propio Excel RC7 declara en su resumen interno y con lo que
  se ve a simple vista en `catalogo.ts`. Lo que sí fue una sorpresa real (documentada en
  la sección 1) es que SharePoint no es un superset: tiene recursos nuevos que ni RC7 ni
  `catalogo.ts` conocen, y reclasificó estados — vale la pena que lo sepas para juzgar
  qué tan "fresco" está lo que el equipo ya cargó ahí.
