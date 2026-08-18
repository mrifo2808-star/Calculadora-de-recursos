import type { GestionRow, ParametrosCurso, ProduccionRow } from '../types';

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

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

export const gestionDefault = (): GestionRow[] => [
  { rowId: nextId('g'), cargo: 'Gestion JP', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 0.25, removable: false },
  { rowId: nextId('g'), cargo: 'Gestion GE', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 0.25, removable: false },
  { rowId: nextId('g'), cargo: 'Gestion DI TL', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 0.1, removable: false },
  { rowId: nextId('g'), cargo: 'Gestion DG TL', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 0.1, removable: false },
  { rowId: nextId('g'), cargo: 'Gestion QA TL', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 0.1, removable: false },
  { rowId: nextId('g'), cargo: 'Gestion DI Senior', cantidad: 1, frecuencia: 'Por semana', hhUnitaria: 2, removable: false },
  { rowId: nextId('g'), cargo: 'Bases Plantillas DG', cantidad: 1, frecuencia: 'Fijo', hhUnitaria: 12, removable: false },
];

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

export const nuevaFilaGestion = (): GestionRow => ({
  rowId: nextId('g'),
  cargo: '',
  cantidad: 1,
  frecuencia: 'Por semana',
  hhUnitaria: 0,
  removable: true,
});
