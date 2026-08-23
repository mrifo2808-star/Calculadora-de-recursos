# VALIDAR — Evaluación de interfaz + limpieza "Innovatia" (2026-08-23)

Rama: `claude/interfaz-20260823` (commit `5069f79`). Sin push, sin deploy. `main` intacto.

## Qué se evaluó

Lectura completa de `src/` (AccessGate, App, ConfirmModal, las 4 tablas/paneles,
CascadaSelector) más prueba en vivo con `npm run dev` en el navegador embebido: pantalla
de login (incluyendo el estado de error, simulado con clave incorrecta), build de
producción y lint.

## Qué cambió (9 archivos, `src/`)

1. **Foco de teclado invisible en inputs de tabla** (`App.css`): `.tabla input[type='text']:focus`
   tenía `outline: none` con más especificidad que la regla global de foco del resto de la
   app — al tabular por la columna "Tarea"/"Cargo" (la más usada de toda la calculadora) el
   usuario de teclado no veía dónde estaba parado. Se quitó esa línea; ahora hereda el
   mismo anillo de foco azul-marino que ya usan botones/selects.
2. **Tabs sin semántica ARIA** (`App.tsx`): el nav de 4 pestañas (Cubicación/Catálogo/
   Resumen/Instrucciones) era una lista de botones sin relación programática con su panel.
   Se agregó `role="tablist"/"tab"/aria-selected` + `role="tabpanel"/aria-labelledby`.
3. **Mensajes dinámicos sin anunciar** (`AccessGate.tsx`, `PanelCatalogo.tsx`): "Clave
   incorrecta", "Cargando…", el aviso de sincronización con Supabase y los mensajes de
   importar/restaurar catálogo aparecían y desaparecían sin `role="alert"`/`role="status"` —
   un lector de pantalla no se enteraba. Verificado en vivo: antes del fix el error de login
   se exponía como `generic` en el árbol de accesibilidad; después, como `alert`.
4. **Objetivos táctiles bajo el mínimo de 24×24px** (`App.css`): el botón 🗑 de eliminar
   fila, el interruptor por fila (✕/toggle) de Gestión y el botón ✕ de cerrar mensaje
   medían ~18-20px. Se ampliaron con padding (y margen negativo donde correspondía, para no
   mover el layout visual).
5. **Contraste insuficiente** (`AccessGate.css`, `App.css`): el texto de nota bajo el botón
   de login y el texto de "sin resultados" del catálogo usaban `#8a94a0` sobre blanco
   (~3.1:1, bajo el 4.5:1 que exige AA para texto normal). Se cambiaron a `#5b6672`
   (~5.9:1), color que ya usa el resto de la app para texto secundario.
6. **Modal de confirmación sin cierre por Escape** (`ConfirmModal.tsx`): reemplaza los
   `window.confirm()` nativos del navegador (restaurar plantilla, restaurar catálogo,
   sincronizar catálogo) pero, a diferencia del nativo, no cerraba con Escape. Se agregó el
   listener (equivalente a "Cancelar").
7. **Tablas sin `scope="col"`** (las 4: Cubicación, Gestión, Catálogo, Resumen): agregado en
   todos los `<th>` — ayuda a la navegación por tabla de lectores de pantalla sin cambiar
   nada visual.
8. **Buscador del catálogo sin nombre accesible** (`PanelCatalogo.tsx`): el input
   `type="search"` solo tenía `placeholder` (no es un label válido). Se agregó
   `aria-label="Buscar en el catálogo"`.

## Qué se descartó y por qué

- **Promover la primera celda de cada fila (Tarea/Cargo/Sección) a `<th scope="row">`**:
  mejora real de accesibilidad de tabla, pero `.tabla th` tiene fondo gris y negrita
  distintos a `.tabla td` — cambiar el tag habría alterado el look de cada fila sin
  aprobación de diseño. Queda como mejora futura si Matías quiere revisarlo.
- **`aria-label` individual en cada input de Cantidad/Frecuencia/HH unitaria**: con
  `scope="col"` ya agregado, la mayoría de lectores de pantalla en modo tabla anuncian el
  encabezado de columna al entrar a la celda. Agregar además un `aria-label` por input en 3
  tablas distintas es más superficie de cambio para una ganancia marginal sobre lo ya hecho.
- **Foco atrapado (focus trap) completo en ConfirmModal**: se agregó el cierre con Escape
  (el gap más importante), pero no un trap de Tab dentro del modal — la app es de un solo
  nivel de overlay, sin menús anidados, y el riesgo de introducir un bug de foco mal hecho
  pesaba más que el beneficio marginal.
- **Colores borderline que sí pasan AA** (ej. `#6b7785` sobre blanco/gris claro, ~4.56:1;
  `.pill--vacia` con contraste similar): pasan el umbral, no se tocaron para no generar
  ruido en el diff.
- **`window.confirm()` / cambios de `AccessGate` más allá de accesibilidad**: no se tocó
  nada del flujo de negocio (login, Supabase, exportación, cálculo) — solo interfaz.

## "Innovatia" en la webapp

Búsqueda case-insensitive en todo `webapp/` (código, `README.md`, `index.html`, `.env*`):
**0 ocurrencias**. No había nada que quitar en esta herramienta. (El encargo original
mencionaba "las otras herramientas" en plural — este cierre cubre solo la Calculadora, que
es el alcance que confirmó el coordinador; si la palabra aparece en otra herramienta del
ecosistema, es un encargo aparte.)

## Cómo verificar (< 10 min)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -3          # debe mostrar 5069f79 en claude/interfaz-20260823
npm run build                  # tsc -b && vite build, sin errores
npm run lint                   # oxlint, mismos 3 warnings preexistentes (fast-refresh), 0 nuevos
npm run dev                    # abrir http://localhost:5173, probar login con clave real
```

En el navegador: tabular con teclado por la tabla de Cubicación (el input "Tarea" ahora
muestra el anillo de foco azul), y con un lector de pantalla activado probar login con
clave incorrecta (debe anunciarse "Clave incorrecta" solo).

## Cómo revertir

```powershell
git checkout main
git branch -D claude/interfaz-20260823   # o simplemente no mergear
```

Ningún archivo fuera de `webapp/src/` fue tocado. `.env` no se tocó (no committeado en
este trabajo, ya estaba configurado localmente).

## Pendiente / requiere decisión de Matías

- **Merge**: la rama queda lista pero sin mergear ni pushear (regla del encargo). Si se
  aprueba: `git checkout main && git merge claude/interfaz-20260823` y push a `main` (el
  workflow de GitHub Actions reconstruye y publica `dist/` en Pages).
- **`scope="row"` en la primera columna de cada tabla**: mejora de accesibilidad adicional
  descartada por riesgo visual — decidir si vale la pena una pasada de diseño para
  habilitarla.
- **Catálogo triplicado** (Excel RC7 / `catalogo.ts` / Supabase) y demás pendientes del
  ecosistema: fuera de alcance de este encargo, sin cambios.
