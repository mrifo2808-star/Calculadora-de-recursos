import type { GestionRow, ParametrosCurso, ProduccionRow } from '../types';

let seq = 0;
export const nextId = (prefix: string) => `${prefix}-${++seq}`;

/** Reinicia el contador de IDs internos (rowId) a 0. Llamar antes de regenerar la
 * plantilla (gestionDefault/produccionDefault) al "Restaurar plantilla", para que los
 * IDs vuelvan a partir de 1 en vez de seguir subiendo desde el uso previo de la sesion. */
export const resetContadorId = (): void => {
  seq = 0;
};

export const PARAMETROS_DEFAULT: ParametrosCurso = {
  proyecto: 'Proyecto Demo',
  cliente: 'Cliente Demo',
  nCursos: 1,
  nSemanas: 4,
  modalidad: 'Full',
};

/* ============================================================================
 * CARGOS BASE DE GESTION — van SIEMPRE en todo proyecto, con este porcentaje fijo
 * sobre el total de HH de producción. Editables SOLO ACÁ, en el código (la tabla de
 * Gestión los muestra de solo lectura: sin input de cargo/tipo/porcentaje, sin botón
 * de eliminar — solo se pueden activar/desactivar). Para cambiar un porcentaje o
 * agregar/quitar un cargo base, editar esta lista y hacer un deploy nuevo.
 *
 * Definidos por Matías el 27-08-2026 (JP 30%, Senior DI/DG/Sop 20/5/5%, Jefes de Área
 * TL DI/DG/Sop 5% cada uno); confirmados como "los de base, van siempre" y bloqueados
 * a edición desde la interfaz el mismo día.
 * ========================================================================== */
export const CARGOS_BASE_GESTION: readonly { cargo: string; porcentaje: number }[] = [
  { cargo: 'Gestion JP', porcentaje: 30 },
  { cargo: 'Gestion DI Senior', porcentaje: 20 },
  { cargo: 'Gestion DG Senior', porcentaje: 5 },
  { cargo: 'Gestion Sop Senior', porcentaje: 5 },
  { cargo: 'Gestion DI TL', porcentaje: 5 },
  { cargo: 'Gestion DG TL', porcentaje: 5 },
  { cargo: 'Gestion Sop TL', porcentaje: 5 },
];

const cargoBase = (cargo: string, porcentaje: number, rowId?: string, activa?: boolean): GestionRow => ({
  rowId: rowId ?? nextId('g'),
  cargo,
  tipo: 'porcentaje',
  cantidad: 1,
  frecuencia: 'Fijo',
  hhUnitaria: 0,
  porcentaje,
  removable: false,
  activa: activa !== false,
});

/**
 * Fuerza que los 7 cargos de `CARGOS_BASE_GESTION` estén siempre presentes, en ese
 * orden, con el tipo/porcentaje del código — nunca el valor que traiga `gestion`, si
 * es que trae uno distinto para el mismo nombre de cargo. Es la única forma de
 * garantizar "van siempre, no editables desde la interfaz" incluso si `gestion` viene
 * de un Excel reimportado (a mano, con otros números) o de un `localStorage` de antes
 * de este bloqueo. Conserva `rowId`/`activa` de la fila existente si ya había una con
 * ese nombre, para no perder el estado de activación de quien cubica. Cualquier cargo
 * agregado a mano (nombre que no es uno de los 7 base) se conserva tal cual, en su
 * mismo orden relativo, después de los 7 base.
 */
export function reconciliarGestionBase(gestion: GestionRow[]): GestionRow[] {
  const nombresBase = new Set(CARGOS_BASE_GESTION.map((c) => c.cargo));
  const base = CARGOS_BASE_GESTION.map((c) => {
    const existente = gestion.find((g) => g.cargo === c.cargo);
    return cargoBase(c.cargo, c.porcentaje, existente?.rowId, existente?.activa);
  });
  const extras = gestion.filter((g) => !nombresBase.has(g.cargo));
  return [...base, ...extras];
}

export const gestionDefault = (): GestionRow[] => reconciliarGestionBase([]);

/** Secciones fijas de Cubicacion, en el mismo orden que el Excel RC7. */
export const SECCIONES = [
  'MODULO INICIAL (1 vez por curso)',
  'POR SEMANA (x N semanas del curso)',
  'IMPLEMENTACION',
  'MODULO DE CIERRE',
  'DEMOSTRACION',
  'RECURSOS ADICIONALES',
] as const;

/** Pseudo-etapa para la tabla de Gestion del proyecto (no es una seccion de Cubicacion,
 * pero se activa/desactiva con el mismo mecanismo de toggle). */
export const ETAPA_GESTION = 'GESTION';

/** Todas las etapas activables del formulario (las secciones de Cubicacion + Gestion). */
export const ETAPAS = [...SECCIONES, ETAPA_GESTION] as const;

/** Todas las etapas activas por defecto. */
export const etapasActivasDefault = (): Record<string, boolean> =>
  Object.fromEntries(ETAPAS.map((etapa) => [etapa, true]));

const row = (
  seccion: string,
  tarea: string,
  cantidad: number,
  frecuencia: ProduccionRow['frecuencia'],
  recursoId: string | null = null,
  removable = false,
): ProduccionRow => ({
  rowId: nextId('p'),
  seccion,
  tarea,
  cantidad,
  frecuencia,
  recursoId,
  removable,
});

export const produccionDefault = (): ProduccionRow[] => [
  row(SECCIONES[0], 'Matriz de alineacion Excel', 1, 'Por curso'),
  row(SECCIONES[0], 'Hoja de ruta PDF 2 pag', 2, 'Por curso'),
  row(SECCIONES[0], 'Foro presentacion Word', 1, 'Por curso'),
  row(SECCIONES[0], 'Video intro Synthesia 1.5 min', 1, 'Por curso'),
  row(SECCIONES[0], 'Evaluacion diagnostica 10 preg', 10, 'Por curso'),

  row(SECCIONES[1], 'Lectura Apuntes PDF 15 pag', 15, 'Por semana'),
  row(SECCIONES[1], 'Micro Learning Rise', 1, 'Por semana', 'Rise|Rise mediatizacion + carga|5 pag'),
  row(SECCIONES[1], 'Podcast (tarifa mixta, no en Catalogo)', 1, 'Por semana'),
  row(SECCIONES[1], 'Infografia', 1, 'Por semana', 'Infografia|Infografia Interactiva|1 pag'),
  row(SECCIONES[1], 'Animacion', 1, 'Por semana', 'Animacion|Animacion T2|2 min'),
  row(SECCIONES[1], 'Storyline', 1, 'Por semana', 'Storyline|Storyline T3|10 sl'),
  row(SECCIONES[1], 'Video contenido', 1, 'Por semana', 'Video|Video After T3|3 min'),
  row(SECCIONES[1], 'Foro conceptualizacion 1 pag', 1, 'Por semana'),
  row(SECCIONES[1], 'Foro aplicacion 2 pag', 2, 'Por semana'),
  row(SECCIONES[1], 'Evaluacion de modulo 20 preg (pendiente: recurso historico, no validado)', 1, 'Por semana'),

  row(SECCIONES[2], 'Libro de calificaciones', 1, 'Por curso'),
  row(SECCIONES[2], 'Modulo inicial plataforma', 1, 'Por curso'),
  row(SECCIONES[2], 'Semana en plataforma', 1, 'Por semana'),
  row(SECCIONES[2], 'Evaluacion final LMS', 1, 'Por curso'),

  row(SECCIONES[3], 'Evaluacion final Word 60 preg', 60, 'Por curso'),
  row(SECCIONES[3], 'Entrega M0 carpeta', 1, 'Por curso'),
  row(SECCIONES[3], 'Entrega semanas carpeta', 1, 'Por semana'),

  row(SECCIONES[4], 'Ejemplo seleccion de recurso', 2, 'Por curso', 'Video|Video After T1|1 min'),
];

export const nuevaFilaProduccion = (seccion: string): ProduccionRow =>
  row(seccion, '', 1, 'Por curso', null, true);

/** Cargo nuevo agregado a mano ("+ Agregar cargo"): nace en modo % Proyecto en 0%,
 * totalmente editable — quien cubica puede cambiarlo a Fijo (Cantidad × Frecuencia ×
 * HH unitaria) con el selector "Tipo" de su fila si prefiere horas fijas en vez de un
 * porcentaje del total. A diferencia de los 7 cargos base, este sí se puede eliminar. */
export const nuevaFilaGestion = (): GestionRow => ({
  rowId: nextId('g'),
  cargo: '',
  tipo: 'porcentaje',
  cantidad: 1,
  frecuencia: 'Por semana',
  hhUnitaria: 0,
  porcentaje: 0,
  removable: true,
  activa: true,
});
