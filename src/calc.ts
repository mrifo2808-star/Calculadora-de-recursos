import { recursoPorId } from './data/catalogo';
import type { Frecuencia, GestionRow, ProduccionRow, RecursoCatalogo } from './types';

export const factorDe = (frecuencia: Frecuencia, nSemanas: number): number =>
  frecuencia === 'Por semana' ? nSemanas : 1;

/* ============================================================================
 * FACTOR DE DURACION DE LOS CARGOS BASE DE GESTION (10-09-2026)
 *
 * Antes, un cargo base de Gestion era un % plano de las HH de produccion: dos proyectos
 * con la misma cubicacion pero uno de 8 y otro de 32 semanas pedian exactamente las
 * mismas horas de jefatura. Eso es falso — la mitad del trabajo de gestion es
 * seguimiento semanal, y ese sí depende del calendario.
 *
 * El modelo de estimacion institucional (MODELO_ESTIMACION_v02.00.xlsx) separa las
 * 481,875 HH de gestion de su proyecto de referencia (16 semanas) en dos partes:
 *
 * - 210 HH (43,6 %) de dedicacion sostenida durante todo el proyecto: JP 10 %,
 *   DI TL 5 %, DI S 10 %, DG S 5 %, QA S 5 % de un FTE = 35 % = 13,125 HH/semana,
 *   x 16 semanas = 210 HH. Comites, seguimiento, informes semanales. Dependen del
 *   CALENDARIO.
 * - 271,875 HH (56,4 %) de arranque, arquitectura, piloto e implementacion. Se hacen
 *   una vez y dependen del TAMAÑO del proyecto, no de cuanto dure.
 *
 * De ahi el 0,56 / 0,44. A 16 semanas el factor vale exactamente 1 y la referencia
 * queda intacta; un proyecto de la misma envergadura pero de 32 semanas suma 44 % mas
 * de gestion, y uno de 8 semanas baja a 0,78.
 * ========================================================================== */

/** Semanas del proyecto de referencia del modelo institucional: el punto donde
 * `factorDuracionGestion` vale exactamente 1 y los porcentajes de `CARGOS_BASE_GESTION`
 * se aplican tal cual. */
export const SEMANAS_REFERENCIA_GESTION = 16;

/** Parte de la gestion que depende del TAMAÑO del proyecto (arranque, arquitectura,
 * piloto, implementacion): no cambia aunque el proyecto dure mas o menos. */
export const PARTE_POR_TAMANO_GESTION = 0.56;

/** Parte de la gestion que depende del CALENDARIO (comites, seguimiento, informes
 * semanales): escala con la duracion. `PARTE_POR_TAMANO + PARTE_POR_CALENDARIO === 1`,
 * que es lo que hace que el factor valga 1 a 16 semanas. */
export const PARTE_POR_CALENDARIO_GESTION = 0.44;

/**
 * Ajuste por duracion que se aplica SOLO a los cargos base de Gestion (ver
 * `calcularGestion`). Un cargo agregado a mano no lo lleva: su porcentaje lo escribio
 * quien cubica para ESE proyecto, con su duracion ya en mente.
 *
 *     factor = 0,56 + 0,44 x (semanas / 16)
 *
 * `nSemanas` es el mismo N° de semanas del proyecto que ya usa el `Factor` de las filas
 * "Por semana" de Cubicacion — no es un dato nuevo. Un valor no finito o negativo se
 * trata como 0 semanas, que deja el factor en su piso de 0,56 (la parte de gestion que
 * existe aunque el proyecto no tenga duracion declarada todavia).
 */
export const factorDuracionGestion = (nSemanas: number): number => {
  const semanas = Number.isFinite(nSemanas) ? Math.max(0, nSemanas) : 0;
  return PARTE_POR_TAMANO_GESTION + PARTE_POR_CALENDARIO_GESTION * (semanas / SEMANAS_REFERENCIA_GESTION);
};

/** Un cargo BASE de Gestion (uno de los 7 de `CARGOS_BASE_GESTION`). `removable === false`
 * es el marcador de "cargo base generado por el sistema" en todo este codigo — lo pone
 * `reconciliarGestionBase` y nunca `nuevaFilaGestion` (ver data/plantilla.ts y
 * TablaGestion.tsx, que usa exactamente esta misma condicion para renderizarlos
 * bloqueados). Solo estos cargos llevan el ajuste por duracion. */
const esCargoBase = (r: GestionRow): boolean => r.removable === false;

/** Etiqueta "Tipo — Nombre visible — Extension" que se escribe en la columna "Tipo /
 * Recurso" del Excel exportado (ver exportCubicacion.ts) — unica fuente de verdad de
 * este formato, tambien usada por importCubicacion.ts para resolver la fila de vuelta a
 * un recursoId al reimportar. */
export const etiquetaCompleta = (r: RecursoCatalogo): string => `${r.tipo} — ${r.nombreVisible} — ${r.extension}`;

export type EstadoFila = 'OK' | 'PENDIENTE DE CATALOGAR' | 'VACIA';

export interface ProduccionCalculada extends ProduccionRow {
  factor: number;
  hhDI: number;
  hhDG: number;
  hhSOP: number;
  total: number;
  estado: EstadoFila;
  etiquetaRecurso: string;
}

export function calcularProduccion(
  rows: ProduccionRow[],
  nSemanas: number,
  catalogo: RecursoCatalogo[],
): ProduccionCalculada[] {
  return rows.map((r) => {
    const recurso = recursoPorId(catalogo, r.recursoId);
    const factor = factorDe(r.frecuencia, nSemanas);
    const cantidad = Number.isFinite(r.cantidad) ? Math.max(0, r.cantidad) : 0;

    if (!recurso) {
      const estado: EstadoFila = r.tarea.trim() ? 'PENDIENTE DE CATALOGAR' : 'VACIA';
      return { ...r, factor, hhDI: 0, hhDG: 0, hhSOP: 0, total: 0, estado, etiquetaRecurso: '' };
    }

    const hhDI = cantidad * factor * (recurso.di ?? 0);
    const hhDG = cantidad * factor * (recurso.dg ?? 0);
    const hhSOP = cantidad * factor * (recurso.sop ?? 0);
    return {
      ...r,
      factor,
      hhDI,
      hhDG,
      hhSOP,
      total: hhDI + hhDG + hhSOP,
      estado: 'OK',
      etiquetaRecurso: etiquetaCompleta(recurso),
    };
  });
}

export interface GestionCalculada extends GestionRow {
  factor: number;
  total: number;
}

/** `baseHH` es el total de HH de produccion del proyecto (recursos de Cubicacion en
 * etapas activas, por curso — ver `totalRecursosCurso`), la base de los cargos tipo
 * 'porcentaje'. Un cargo 'fijo' ignora `baseHH` (usa cantidad/factor/hhUnitaria, igual
 * que un recurso de Cubicacion); uno 'porcentaje' ignora cantidad/frecuencia/hhUnitaria.
 *
 * Los 7 cargos BASE (tipo 'porcentaje', `removable === false`) llevan ademas el ajuste
 * por duracion `factorDuracionGestion(nSemanas)`:
 *
 *     HH = % del cargo x baseHH x (0,56 + 0,44 x nSemanas / 16)
 *
 * Un cargo 'porcentaje' agregado a mano NO lo lleva (factor 1): sigue siendo un % plano
 * de la produccion, como antes. */
export function calcularGestion(rows: GestionRow[], nSemanas: number, baseHH: number): GestionCalculada[] {
  return rows.map((r) => {
    if (r.tipo === 'fijo') {
      const factor = factorDe(r.frecuencia, nSemanas);
      const cantidad = Number.isFinite(r.cantidad) ? r.cantidad : 0;
      return { ...r, factor, total: cantidad * factor * (r.hhUnitaria || 0) };
    }
    const porcentaje = Number.isFinite(r.porcentaje) ? Math.max(0, r.porcentaje) : 0;
    // Los 7 cargos base escalan con la duracion del proyecto; uno agregado a mano no
    // (su porcentaje ya lo escribio quien cubica para este proyecto). Se expone en
    // `factor` para que la columna "Factor" del Excel exportado muestre de donde sale
    // el total, igual que hace un cargo 'fijo' con su factor de frecuencia.
    const factor = esCargoBase(r) ? factorDuracionGestion(nSemanas) : 1;
    return { ...r, factor, total: baseHH * (porcentaje / 100) * factor };
  });
}

export interface Resumen {
  hhDICurso: number;
  hhDGCurso: number;
  hhSOPCurso: number;
  totalRecursosCurso: number;
  hhGestionCurso: number;
  totalGeneralCurso: number;
  hhDIProyecto: number;
  hhDGProyecto: number;
  hhSOPProyecto: number;
  totalRecursosProyecto: number;
  hhGestionProyecto: number;
  totalGeneralProyecto: number;
  subtotalesPorSeccion: { seccion: string; total: number }[];
  recursosSeleccionados: number;
  recursosOk: number;
  pendientesDeCatalogar: number;
  cubicacionCompleta: boolean;
}

/** Total de HH de produccion (DI+DG+SOP) del proyecto, por curso — la "base" sobre la
 * que se calculan los cargos de Gestion de tipo 'porcentaje' (ver calcularGestion) y
 * tambien el campo `totalRecursosCurso` de este mismo Resumen: una sola formula para
 * ambos usos, para que el preview en vivo de la tabla de Gestion y el Resumen final
 * jamas puedan mostrar numeros distintos. */
export function totalRecursosCurso(produccion: ProduccionCalculada[]): number {
  const hhDI = round2(sum(produccion.map((r) => r.hhDI)));
  const hhDG = round2(sum(produccion.map((r) => r.hhDG)));
  const hhSOP = round2(sum(produccion.map((r) => r.hhSOP)));
  return round2(hhDI + hhDG + hhSOP);
}

export function calcularResumen(
  produccion: ProduccionCalculada[],
  gestion: GestionCalculada[],
  nCursos: number,
  secciones: readonly string[],
): Resumen {
  const hhDICurso = round2(sum(produccion.map((r) => r.hhDI)));
  const hhDGCurso = round2(sum(produccion.map((r) => r.hhDG)));
  const hhSOPCurso = round2(sum(produccion.map((r) => r.hhSOP)));
  const totalRecursosCursoValor = totalRecursosCurso(produccion);
  const hhGestionCurso = round2(sum(gestion.map((r) => r.total)));
  const totalGeneralCurso = round2(totalRecursosCursoValor + hhGestionCurso);

  const subtotalesPorSeccion = secciones.map((seccion) => ({
    seccion,
    total: round2(sum(produccion.filter((r) => r.seccion === seccion).map((r) => r.total))),
  }));

  const recursosSeleccionados = produccion.filter((r) => r.recursoId).length;
  const recursosOk = produccion.filter((r) => r.estado === 'OK').length;
  const pendientesDeCatalogar = produccion.filter((r) => r.estado === 'PENDIENTE DE CATALOGAR').length;

  return {
    hhDICurso,
    hhDGCurso,
    hhSOPCurso,
    totalRecursosCurso: totalRecursosCursoValor,
    hhGestionCurso,
    totalGeneralCurso,
    hhDIProyecto: round2(hhDICurso * nCursos),
    hhDGProyecto: round2(hhDGCurso * nCursos),
    hhSOPProyecto: round2(hhSOPCurso * nCursos),
    totalRecursosProyecto: round2(totalRecursosCursoValor * nCursos),
    hhGestionProyecto: round2(hhGestionCurso * nCursos),
    totalGeneralProyecto: round2(totalGeneralCurso * nCursos),
    subtotalesPorSeccion,
    recursosSeleccionados,
    recursosOk,
    pendientesDeCatalogar,
    cubicacionCompleta: pendientesDeCatalogar === 0,
  };
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);
const round2 = (n: number): number => Math.round(n * 100) / 100;
