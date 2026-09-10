/** Build id visible en el pie de la app (ver FooterWeLearn.tsx) — bump manual en cada
 * cambio de producto notable, para que quien revisa el sitio publicado pueda confirmar
 * a simple vista que el deploy corresponde a la version esperada. No hay CI que lo
 * genere automatico ni un versionado semver establecido para esta app todavia: se usa
 * la fecha del cambio (mismo criterio de fechado que el resto del ecosistema WeLearn,
 * ver VALIDAR-*.md), no un numero de version. Si hay mas de un deploy el mismo dia, se
 * agrega un correlativo (`.2`, `.3`...) para que el pie siga distinguiendo las versiones. */
export const BUILD_ID = '2026-09-10.2';
