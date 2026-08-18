import { recursoPorId } from './data/catalogo';
import type { Frecuencia, GestionRow, ProduccionRow, RecursoCatalogo } from './types';

export const factorDe = (frecuencia: Frecuencia, nSemanas: number): number =>
  frecuencia === 'Por semana' ? nSemanas : 1;

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
      etiquetaRecurso: `${recurso.tipo} — ${recurso.nombreVisible} — ${recurso.extension}`,
    };
  });
}

export interface GestionCalculada extends GestionRow {
  factor: number;
  total: number;
}

export function calcularGestion(rows: GestionRow[], nSemanas: number): GestionCalculada[] {
  return rows.map((r) => {
    const factor = factorDe(r.frecuencia, nSemanas);
    const cantidad = Number.isFinite(r.cantidad) ? r.cantidad : 0;
    return { ...r, factor, total: cantidad * factor * (r.hhUnitaria || 0) };
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

export function calcularResumen(
  produccion: ProduccionCalculada[],
  gestion: GestionCalculada[],
  nCursos: number,
  secciones: readonly string[],
): Resumen {
  const hhDICurso = round2(sum(produccion.map((r) => r.hhDI)));
  const hhDGCurso = round2(sum(produccion.map((r) => r.hhDG)));
  const hhSOPCurso = round2(sum(produccion.map((r) => r.hhSOP)));
  const totalRecursosCurso = round2(hhDICurso + hhDGCurso + hhSOPCurso);
  const hhGestionCurso = round2(sum(gestion.map((r) => r.total)));
  const totalGeneralCurso = round2(totalRecursosCurso + hhGestionCurso);

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
    totalRecursosCurso,
    hhGestionCurso,
    totalGeneralCurso,
    hhDIProyecto: round2(hhDICurso * nCursos),
    hhDGProyecto: round2(hhDGCurso * nCursos),
    hhSOPProyecto: round2(hhSOPCurso * nCursos),
    totalRecursosProyecto: round2(totalRecursosCurso * nCursos),
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
