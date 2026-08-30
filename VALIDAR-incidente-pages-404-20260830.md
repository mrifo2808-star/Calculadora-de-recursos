# VALIDAR — Incidente: Calculadora publicada caída (404 / sitio sin compilar)

Rama: `claude/fix-github-pages-deploy-20260830` (pusheada, no mergeada). Sobre `main` @
`11c8838`.

## Causa raíz (confirmada con la API de GitHub, no supuesta)

**No es un problema de código.** Es un problema de configuración de GitHub Pages en el
repositorio, causado por la secuencia: el repo pasó a privado → GitHub apagó Pages solo
(Pages con repo privado en cuenta personal necesita plan pago) → al volver el repo a
público, **Settings → Pages no se restauró solo**: quedó en el modo clásico "Deploy from
a branch: main /(root)" (sirviendo el `index.html` de código fuente sin compilar, o
directamente "site not found") en vez de "GitHub Actions" (que sí construye y publica
`dist/`).

Evidencia verificada hoy (2026-08-30), en orden:

1. `GET /repos/.../pages` → `404 Not Found` cuando el síntoma era "site not found" —
   confirmaba que Pages no estaba configurado, no un problema de permisos.
2. El workflow `.github/workflows/deploy.yml` **sí existe y sí corrió con éxito**: el
   último run antes del incidente (commit `11c8838`, 2026-08-28 15:35) generó un
   deployment real apuntando exactamente a
   `https://mrifo2808-star.github.io/Calculadora-de-recursos/`. El workflow nunca fue
   el problema.
3. Después de que Matías cambió Source a "GitHub Actions", el sitio pasó de 404 a
   `200 OK` — pero sirviendo el **`index.html` de código fuente sin compilar**
   (`<script type="module" src="/src/main.tsx">`, 387 bytes) en vez del build real
   (`dist/index.html`, que referencia `/Calculadora-de-recursos/assets/index-*.js`
   hasheado). Eso es la huella exacta del modo clásico "Deploy from a branch:
   main /(root)" sirviendo el repo tal cual, no un build de Actions — confirma que el
   cambio de Source no había disparado todavía un despliegue nuevo vía Actions (o un
   build clásico en cola de un momento anterior lo pisó).
4. `base: '/Calculadora-de-recursos/'` en `vite.config.ts` **ya estaba correcto** (case
   exacto con el nombre del repo) — verificado además generando el build localmente:
   `dist/index.html` referencia las rutas correctas. No era el problema, y no se tocó.
5. El repo git **es** la carpeta `webapp` (no hay una subcarpeta extra que desalinee
   `working-directory` — el `package.json`, `.github/workflows/`, todo vive en la raíz
   del repo). El workflow ya construye y sube `dist` desde ahí, sin desajuste.

En resumen: workflow correcto, build correcto, `base` correcto, sin desajuste de
subcarpeta — el único problema real era el interruptor de Settings → Pages, que quedó
en el estado equivocado tras el ciclo privado→público y no se autocorrigió.

## Qué se corrigió en el código (mejora, no la causa raíz)

`.github/workflows/deploy.yml`:
- Se agregó `actions/configure-pages@v5` antes de `upload-pages-artifact` — es el paso
  que falta respecto a la plantilla oficial de GitHub para Pages + Actions con un
  framework custom (Vite). No causaba el incidente de hoy, pero es una buena práctica
  real que GitHub recomienda y que faltaba (uno de los puntos que pediste revisar
  explícitamente).
- Se agregó un comentario al inicio del archivo con el resumen del incidente y los 2
  pasos de recuperación exactos, para que la próxima vez que esto pase (ej. si el repo
  vuelve a ponerse privado y público) quede documentado ahí mismo, no solo en este
  VALIDAR.

`README.md`: nueva sub-sección "Si el sitio publicado da 'There isn't a GitHub Pages
site here'" con el mismo procedimiento de recuperación, más una sección nueva
"Despliegue alternativo: Cloudflare Pages" con los pasos completos (ver recomendación
abajo).

## Lo que NO se pudo arreglar desde el código — acción tuya, ahora

Nada de lo anterior por sí solo republica el sitio: Settings → Pages es una acción de
cuenta que no puedo tocar sin credenciales (y aunque pudiera, es justo el tipo de cambio
que corresponde que hagas tú). **Esto desbloquea la Calculadora ya, sin esperar ningún
merge:**

1. GitHub → `mrifo2808-star/Calculadora-de-recursos` → **Settings → Pages** → confirmar
   que "Source" siga en **GitHub Actions** (vuelve a entrar a la página después de
   guardar para confirmar que quedó, no solo que el guardado no dio error).
2. **Actions → "Deploy to GitHub Pages" → Run workflow** (rama `main`) — no hace falta
   esperar el merge de esta rama, el workflow ya existe en `main` tal cual, tiene
   `workflow_dispatch`.
3. Esperar ~1 minuto, recargar `https://mrifo2808-star.github.io/Calculadora-de-recursos/`
   con Ctrl+Shift+R (para saltarse caché). Debería verse la app real, no una pantalla en
   blanco ni "site not found".

Si después de eso el merge de esta rama se hace, el próximo push a `main` volverá a
disparar el deploy solo (con el `configure-pages` ya agregado) — no hace falta repetir
el paso 2 cada vez, solo esta vez porque no hay push nuevo pendiente.

## Recomendación franca: sí, mover a Cloudflare Pages

Este es el **segundo incidente consecutivo** relacionado con GitHub Pages y el estado
público/privado del repo en dos turnos seguidos de esta conversación. Recomiendo migrar
a Cloudflare Pages:

- **Sirve repos privados gratis** — elimina la causa raíz de raíz: ya no importa si el
  repo está público o privado, nunca más se apaga el sitio por eso.
- Matías **ya usa Cloudflare** para la landing de Mesura y para `worker-catalogo/` de
  esta misma herramienta — es una plataforma ya conocida y operativa, no una pieza nueva
  que aprender de cero.
- Permite volver el repo a privado de forma permanente sin perder el sitio publicado —
  hoy el repo tiene que quedarse público solo para que GitHub Pages funcione, lo cual
  expone `.env` (Supabase URL + anon key, documentados como seguros de exponer porque
  dependen de RLS, pero de todas formas es superficie pública innecesaria si hay una
  alternativa igual de fácil que no la requiere).
- Cero cambios de código necesarios: el `base` de `vite.config.ts` queda intacto (sigue
  sirviendo a GitHub Pages si se mantiene en paralelo), y Cloudflare Pages lo sobrescribe
  con el flag de build `--base=/` — ver pasos completos en el README, sección
  "Despliegue alternativo: Cloudflare Pages".

No lo ejecuté yo: conectar el repo a Cloudflare Pages requiere que Matías autorice la
GitHub App de Cloudflare (o ya la tenga autorizada de las otras herramientas) y complete
el dashboard — dejé los pasos exactos en el README para que lo haga cuando quiera, sin
apuro (GitHub Pages ya queda funcionando con los 3 pasos de arriba).

## Cómo verificar (una vez reactivado Pages)

1. Abrir `https://mrifo2808-star.github.io/Calculadora-de-recursos/` — debe cargar la
   pantalla de login de la Calculadora (no 404, no pantalla en blanco).
2. Ver → código fuente de la página: debe referenciar
   `/Calculadora-de-recursos/assets/index-*.js` (build real), no `/src/main.tsx`
   (fuente sin compilar).
3. `npm test -- --run` → 65/65. `npm run build` → sin errores (ya verificado en esta
   sesión).

## Pasos exactos para ti (cmd.exe) — mergear esta rama

```
cd "C:\Users\matia\Downloads\WeLearn-Trabajo\Carpetas\Carpeta - Base arbol Wrike\Calculadora\webapp"
git fetch origin
git checkout main
git merge --no-ff origin/claude/fix-github-pages-deploy-20260830
git push origin main
```

Esto es independiente de los 3 pasos de reactivación de arriba — hazlos primero (son los
que de verdad restauran el sitio ahora), y mergea esta rama cuando quieras (deja el
workflow con `configure-pages` para builds futuros).

## Cómo revertir
No se mergeó a `main` — si no la usas, no la mergees. Si ya la mergeaste:
`git revert <hash-del-merge>`.

## Pendiente / a tu criterio
1. Confirmar que la reactivación manual (pasos 1-3 de arriba) efectivamente restauró el
   sitio — no pude verificarlo yo mismo en el momento porque depende de que hagas el
   clic en Settings/Actions.
2. Decidir sobre la migración a Cloudflare Pages (recomendada arriba) — no urgente una
   vez que GitHub Pages vuelva a andar, pero evita que esto se repita.
3. Hay una rama previa sin mergear (`claude/catalogo-fuente-unica-20260829`, del encargo
   anterior sobre la fuente única del catálogo) — no relacionada con este incidente,
   sigue pendiente de tu merge por separado.

## Qué resultó falso de la premisa
- Tu hipótesis del mensaje anterior (repo privado bloqueando Pages en un plan free) era
  el mecanismo correcto, pero el estado ACTUAL verificado era distinto de lo que
  parecía: el repo ya estaba público de nuevo y aun así el sitio no volvía — porque el
  problema no es "¿está privado ahora?" sino que **Pages no se reactiva solo al volver a
  público**, hay que reelegir Source a mano. Ese matiz es el que explica por qué cambiar
  el Source "no funcionó" a la primera: probablemente sí quedó guardado, pero aún no se
  había disparado un despliegue nuevo por Actions que reemplazara lo que había quedado
  publicado por el modo clásico.
