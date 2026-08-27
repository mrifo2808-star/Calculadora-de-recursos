import { recursoPorId } from './data/catalogo';
import type { Frecuencia, GestionRow, ProduccionRow, RecursoCatalogo } from './types';

export const factorDe = (frecuencia: Frecuencia, nSemanas: number): number =>
  frecuencia === 'Por semana' ? nSemanas : 1;

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
 * que un recurso de Cubicacion); uno 'porcentaje' ignora cantidad/frecuencia/hhUnitaria. */
export function calcularGestion(rows: GestionRow[], nSemanas: number, baseHH: number): GestionCalculada[] {
  return rows.map((r) => {
    if (r.tipo === 'fijo') {
      const factor = factorDe(r.frecuencia, nSemanas);
      const cantidad = Number.isFinite(r.cantidad) ? r.cantidad : 0;
      return { ...r, factor, total: cantidad * factor * (r.hhUnitaria || 0) };
    }
    const porcentaje = Number.isFinite(r.porcentaje) ? Math.max(0, r.porcentaje) : 0;
    return { ...r, factor: 1, total: baseHH * (porcentaje / 100) };
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
