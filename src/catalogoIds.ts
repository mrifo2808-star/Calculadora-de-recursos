/**
 * Utilidades sobre el ID tecnico del catalogo, SIN dependencias.
 *
 * Vive aparte de excelCatalogo.ts a proposito: ese modulo importa xlsx (~500 KB) y se
 * carga con import() dinamico recien al sincronizar. CatalogContext.tsx necesita derivar
 * el alcance en cada lectura del catalogo, asi que importarlo desde excelCatalogo.ts
 * meteria xlsx en el bundle principal.
 */

/**
 * El ID tecnico del catalogo compartido es la clave compuesta
 * `Tipo|Nombre visible|Extension|Alcance de entrega`.
 *
 * El cuarto segmento es lo UNICO que distingue dos filas con el mismo nombre y la misma
 * extension — por ejemplo «Entrega en carpeta» frente a «Entrega en carpeta y carga en
 * LMS». Sin el, quien cubica ve dos opciones identicas en la lista y elige a ciegas.
 *
 * Devuelve cadena vacia si el ID no trae ese segmento (IDs generados por el parser, o
 * catalogos anteriores al formato de 4 partes).
 */
export function alcanceDesdeId(id: string): string {
  const partes = id.split('|');
  return partes.length >= 4 ? partes.slice(3).join('|').trim() : '';
}
