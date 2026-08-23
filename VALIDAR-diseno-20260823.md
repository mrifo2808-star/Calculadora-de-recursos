# VALIDAR — Sistema de diseño WeLearn v1 + pie estándar (2026-08-23)

Rama: `claude/interfaz-20260823` (commit `4c25c43`, sobre `5069f79`/`c7aa867` de la
evaluación de interfaz previa en la misma rama). Sin push, sin deploy. `main` intacto.

## Qué cambió

Aplicación completa de `Diseno-WeLearn\DISENO.md` + `tokens.css` a la Calculadora.

**Cómo se aplicó (decisión de ruta)**: la webapp no usa Tailwind (`package.json` no
tiene la dependencia, no hay `tailwind.config`). El propio `DISENO.md` ofrece dos rutas
para la Calculadora: mapear a config de Tailwind, **o** importar `tokens.css` global y
usar `var(...)` en los componentes. Se tomó la segunda por ser la que aplica al stack
real del proyecto sin introducir una dependencia nueva ni convertir ~950 líneas de CSS a
utility classes — cambio de mayor riesgo que no correspondía a este encargo.

- `src/tokens.css`: copia local de `Diseno-WeLearn/tokens.css` (paleta, semáforo AA,
  tipografía/escala, radios/sombras, foco global, `.wl-footer`), importada una sola vez
  en `src/index.css`.
- **Header**: degradado navy 135° (antes navy plano), `h1` a 17px/800 (antes 24px/700).
- **Tablas** (Cubicación, Gestión, Catálogo, Resumen): encabezado navy con texto blanco
  uppercase 10.5px (antes gris claro `#f1f4f8`/texto oscuro) — el cambio visual más
  visible de todo el commit; hover de fila a `--celestebg` (celeste muy suave).
- **Badges de estado** (`pill--ok/pendiente/vacia`): a los pares texto/fondo AA exactos
  del semáforo del sistema (verde `#2f855a`/`#e6f6ee`, ámbar `#8a5d00`/`#fff6e5`, gris
  `#5a6b82`/`#eef1f5`) — antes tonos propios de la Calculadora, cercanos pero no
  idénticos a los de otras herramientas del ecosistema.
- **KPIs de Resumen** (`.tarjeta__valor`): 24px navy 800 (antes 22px 700), tarjeta
  destacada con texto blanco (antes verde-menta `#6fd3a8`, fuera de la paleta del
  sistema — no aparece en `tokens.css` en ningún rol).
- **Foco de teclado**: el anillo de foco global pasa de navy (`#10243e`) a `--blue`
  (`#2b6cb0`, el mismo azul de foco de `tokens.css`) — mismo color de foco en toda
  herramienta que adopte el sistema.
- **Toggles** (interruptor de etapa/fila): el punto cuando está activo pasa de
  verde-menta a `--celeste` (acento de marca) — decorativo, sin texto encima, sin riesgo
  de contraste.
- **Objetivos táctiles en móvil**: `@media (max-width:640px) { button, input, select {
  min-height: var(--touch) /* 44px */ } }` en `App.css`, y su equivalente en
  `AccessGate.css` para el input/botones del login — regla explícita de "Principios" del
  sistema, antes ausente.
- **Pie estándar**: `src/components/FooterWeLearn.tsx`, texto exacto
  "Calculadora de Recursos WeLearn · Desarrollado por Matías Rifo V.",
  `role="contentinfo"`. Visible en las 3 pantallas sin sesión del `AccessGate`
  (cargando, «Falta configurar Supabase», formulario de login) y en el pie funcional de
  `App.tsx` (junto a «Cerrar sesión» y la nota de privacidad).

## Cómo se evitó romper la accesibilidad AA de la sesión anterior

- El foco visible, los `role="alert"/"status"`, los `scope="col"`, los roles ARIA de
  tabs y los objetivos táctiles ampliados (`.btn-icon`, `.fila-toggle`,
  `.mensaje__cerrar`) de la sesión anterior **no se tocaron en su lógica** — este commit
  solo cambió qué color/token usa cada regla, no si existe.
- `--muted` (el gris del sistema) está calibrado para AA sobre fondos **claros**
  (`--bg`/`--card`). El `AccessGate` tiene una pantalla con fondo oscuro (degradado
  navy) fuera del sistema de cards blancas — ahí se agregó una variante de color
  (`#bcd7f0`, el mismo tono que ya usa el header de la app para texto secundario sobre
  navy) en vez de aplicar `--muted` literal, que hubiera dado bajo contraste sobre ese
  fondo. Verificado en vivo con `getComputedStyle`: pie del login en `rgb(188, 215,
  240)` sobre el degradado oscuro.
- **No se introdujo el botón primario celeste** (`.abtn`, texto blanco sobre `--celeste`)
  en ningún botón de la app (login, exportar, confirmar), pese a que el catálogo de
  componentes del sistema lo define. Motivo: a los tamaños de botón que usa esta app
  (13–14px bold), blanco sobre `#4299e1` calcula ~3.05:1 de contraste — por debajo del
  4.5:1 que exige AA para texto normal (y por debajo incluso del umbral de "texto
  grande" de WCAG, que requiere ≥18.66px bold). Aplicarlo tal cual habría regresionado
  el contraste de esos botones respecto a lo que dejó la sesión anterior. Se mantuvo el
  botón "secundario" (borde/fondo navy, texto blanco en hover) recoloreado a tokens, que
  sí es AA en todos los tamaños usados. **Esto es un hallazgo del sistema en sí, no un
  defecto de esta herramienta** — cualquier otra herramienta que aplique `.abtn` literal
  con botones chicos tiene el mismo problema; vale la pena que Matías lo revise en
  `Diseno-WeLearn/tokens.css` (subir el mínimo de tamaño del botón primario, u oscurecer
  `--celeste` para uso como fondo).

## Qué se descartó y por qué

- **Config de Tailwind**: descartada por no existir en el proyecto (ver arriba).
- **Promover botones a `.abtn` primario celeste**: descartado por la razón de contraste
  explicada arriba.
- **Bajar `.acceso__tarjeta` de 16px a `--radius` (8px) sin revisar con Matías**: sí se
  aplicó — es una superficie (`.tarjeta`), coincide con la regla "8px superficies" del
  sistema; queda documentado por si el tamaño anterior (16px) era intencional para
  distinguir la card de login del resto (más grande = más prominente). Reversible en una
  línea si Matías prefiere el original.
- **Recolorear el borde decorativo de los avisos ámbar/verde** (`#f0e0a8`/`#bfe9d3`) y el
  divisor sutil entre filas de tabla (`#eef1f4`): el sistema no define tokens para esos
  usos (son decorativos, no texto), se dejaron como estaban para no introducir cambios
  sin una base clara en `tokens.css`.

## Cómo verificar (< 10 min)

```powershell
cd "Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git log --oneline -5          # debe mostrar 4c25c43 en claude/interfaz-20260823
npm run build                  # tsc -b && vite build, sin errores
npm run lint                   # oxlint, mismos 3 warnings preexistentes, 0 nuevos
npm run dev                    # abrir http://localhost:5173
```

En el navegador: la pantalla de login ya se ve con el header/botón navy y el pie
"Calculadora de Recursos WeLearn · Desarrollado por Matías Rifo V." debajo de la tarjeta.
Con sesión iniciada: los encabezados de las 4 tablas (Cubicación, Gestión, Catálogo,
Resumen) deben verse navy con texto blanco; el total del header y las tarjetas de KPI
destacadas ya no muestran el verde-menta anterior.

## Cómo revertir

```powershell
git checkout main
git branch -D claude/interfaz-20260823   # o no mergear
```

Si se quiere revertir solo este commit de diseño y conservar los arreglos de
accesibilidad de la sesión anterior: `git revert 4c25c43` sobre la rama (deja `5069f79`
y `c7aa867` intactos).

## Pendiente / requiere decisión de Matías

- **Merge/push**: la rama sigue sin mergear (regla del encargo). Comandos arriba.
- **Botón primario celeste**: revisar el tamaño mínimo de `.abtn` en `tokens.css` /
  `DISENO.md` para que sea AA a los tamaños que de hecho usan las herramientas del
  ecosistema (ver hallazgo arriba) — afecta a todas, no solo a la Calculadora.
- **Radio de `.acceso__tarjeta`** (16px → 8px): confirmar si el tamaño anterior era
  intencional.
- Catálogo triplicado y demás pendientes del ecosistema: sin cambios, fuera de alcance.
