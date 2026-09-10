# VALIDAR — Toggle «Incluir gestión docente (DI)» (10-09-2026)

Rama: `claude/gestion-docente-20260910` (basada en `main` = `ac55031`, lo que está en
producción). **Sin push ni deploy** — decide Matías (ver "Cómo desplegar").

## Qué cambió

**1. Toggle en la pestaña Cubicación**, apagado por defecto, arriba de las secciones (no
pertenece a ninguna etapa: desactivar «Gestión del proyecto» no lo apaga).

- Etiqueta: **«Incluir gestión docente (DI)»**.
- Explicación **al lado del botón y como tooltip** (`title`) al pasar el mouse, con el
  texto definido por Matías.
- Activo, muestra **siempre el desglose**: `12 cursos × 16 semanas × 0,5 HH = 96 HH`, más
  cuánto suma por curso.
- Sobre **16 semanas**, muestra el **aviso** de proyecto largo junto al desglose. No
  bloquea el toggle.

**2. Fórmula** (`src/calc.ts`, `calcularGestionDocente`):

```
HH gestión docente = 0,5 × N° cursos × N° semanas
```

- **Se suma a la línea de HH DI** del Resumen (por curso y por proyecto), y con eso a
  Total HH recursos y Total general. Las tarjetas de DI dicen «incluye X HH de gestión
  docente».
- **Aditiva**: los cargos base de Gestión (incluidos DI Senior y DI TL) no cambian.
- **No entra en la base de los cargos %** (`baseGestionHH`): si entrara, los cargos base
  cobrarían un % de gestión sobre horas que ya son de gestión, y sus HH validadas
  cambiarían solo por activar el toggle.
- Todo el Resumen es «por curso × N° cursos»: se suma 0,5 × semanas por curso, así el
  proyecto queda en 0,5 × cursos × semanas **sin contar los cursos dos veces** (con test).

**3. N° de cursos: NO hubo que agregarlo.** Ya existía como «N° cursos» en Parámetros
(`ParametrosCurso.nCursos`, mínimo 1) — es el mismo que multiplica los totales del
proyecto, y se exporta e importa. El toggle usa ese y el N° semanas de Parámetros; la
ayuda del toggle dice dónde se editan.

**4. Persistencia y Excel**
- El toggle vive en `ParametrosCurso.gestionDocente`. Un `localStorage` de antes de este
  cambio queda **apagado** (`migrarParametros` en `data/plantilla.ts`).
- Export: columna **«Gestión docente (DI)»** (Sí/No) en la hoja Parámetros; si está
  activo, la hoja Resumen agrega «incluye gestión docente (DI)» y el desglose literal.
- Import: la columna es **opcional**; si falta (archivos anteriores) o está vacía, queda
  apagado. Solo un «sí» explícito lo enciende.

**5. Instrucciones** (punto 5), **README** y **`BUILD_ID`** `2026-09-10` → `2026-09-10.2`
(producción ya está en `2026-09-10`; el correlativo permite distinguir el segundo deploy
del día — la convención quedó anotada en `buildInfo.ts`).

**No se tocó** `CARGOS_BASE_GESTION` ni el factor de duración (verificado con
`git diff main`).

## Tests

**111/111** (`main` estaba en 80/80): 31 nuevos.

- `calc.test.ts` (22): toggle apagado por defecto (incluido `localStorage` viejo), fórmula
  (12 × 16 = 96, 1 × 4 = 2, 7 × 9 = 31,5, valores inválidos = 0), desglose con singular y
  plural, aviso a 16 (no) / 17 (sí), aviso que no bloquea (69 × 69 sigue calculando),
  suma a DI por curso y proyecto, no toca DG/SOP, total del proyecto +96 exacto, DI + DG
  + SOP cuadra con Total recursos, gestión del ratio intacta, base de los cargos % intacta,
  y compatibilidad (`calcularResumen` sin el argumento nuevo = resultado de siempre).
- `importCubicacion.test.ts` (3): archivo sin la columna → apagado; «Sí»/«si» → encendido;
  «No»/vacío → apagado; la columna faltante no genera avisos.
- `components/TablaCubicacion.test.ts` (6, **nuevo**): render real del componente con
  `react-dom/server` (sin DOM, mismo environment `node`): toggle apagado y sin desglose con
  los parámetros por defecto; explicación al lado y en el `title`; activo → marcado y con
  desglose; aviso a 17 semanas y no a 16; apagado en proyecto largo → ni desglose ni aviso.

## Cómo verificarlo en <10 min

```bash
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git checkout claude/gestion-docente-20260910
npm run test    # 111/111
npm run build
npm run dev     # http://localhost:5173 (requiere la clave de acceso del equipo)
```

1. Pestaña Cubicación: el toggle «Incluir gestión docente (DI)» aparece **apagado**, con
   la explicación al lado; al pasar el mouse sobre el botón sale el mismo texto.
2. Parámetros: N° cursos = **12**, N° semanas = **16**. Activar el toggle → desglose
   **«12 cursos × 16 semanas × 0,5 HH = 96 HH»**, sin aviso.
3. Resumen: **HH DI total sube 96** y dice «incluye 96 HH de gestión docente». HH gestión
   total **no cambia**. El total del header sube 96.
4. N° semanas = **17** → aparece el aviso amarillo; el toggle sigue funcionando.
5. Exportar a Excel: Parámetros trae «Gestión docente (DI) = Sí»; Resumen trae la fila
   «incluye gestión docente (DI)» y el desglose. Reimportar ese archivo → toggle encendido.
6. Pie de página: **build 2026-09-10.2**.

## Cómo desplegar (lo hace Matías)

```bash
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git checkout main
git merge --no-ff claude/gestion-docente-20260910
npm run test              # el workflow de Pages NO corre tests
git push origin main      # dispara el deploy a GitHub Pages
```

Con el toggle apagado (el default) **ninguna cubicación cambia de número** al desplegar:
solo suma horas si alguien lo activa.

## Cómo revertir

Antes del merge: `git checkout main && git branch -D claude/gestion-docente-20260910`.
Después: `git revert -m 1 <sha del merge>` y push. Un `localStorage` que ya guardó
`gestionDocente` no rompe la versión anterior: esa versión ignora el campo.

## Qué resultó falso de la premisa

1. **«El número de cursos probablemente no existe como dato»**: sí existe — «N° cursos»
   de Parámetros. No se agregó un campo nuevo (habría sido un segundo número de cursos
   que podía no coincidir con el que multiplica los totales).
2. **«69 cursos y 69 semanas da 1.190 HH»**: con la fórmula especificada da **2.380,5 HH**
   (0,5 × 69 × 69). 1.190 corresponde a 0,25 HH/curso/semana. El argumento se sostiene
   igual —es aún más absurdo—, pero la cifra no.

## Pendientes / cuidados

- **No se verificó la app en el navegador** (clave de acceso compartida; no corresponde
  que un agente autentique). Cubre esa brecha el test de render de `TablaCubicacion`, que
  verifica el HTML real del toggle, el tooltip, el desglose y el aviso; los pasos 1-6 de
  arriba quedan para Matías.
- La rama `claude/usabilidad-3-revisores` (con cambios sin commitear, respaldados en
  `Calculadora\backups\pendiente-usabilidad-3-revisores.patch.*.bak`) sigue pendiente y
  toca `calc.ts`, `calc.test.ts`, `TablaCubicacion.tsx`, `PanelResumen.tsx`,
  `PanelInstrucciones.tsx`, `App.css` y `exportCubicacion.ts` — **casi los mismos
  archivos que esta rama**. Al integrar ambas va a haber conflictos textuales (ninguno de
  fondo: esa rama renombra etiquetas de estado de fila, esta agrega el toggle).
