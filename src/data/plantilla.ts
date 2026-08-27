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

/** Cargo de Gestion: sus HH son siempre un porcentaje fijo del total de HH de produccion
 * del proyecto (ver calcularGestion/totalRecursosCurso en calc.ts). No existe otra
 * modalidad — ni horas fijas, ni cantidad/frecuencia propias. */
const cargoPorcentaje = (cargo: string, porcentaje: number, removable = false): GestionRow => ({
  rowId: nextId('g'),
  cargo,
  porcentaje,
  removable,
  activa: true,
});

/** Porcentajes de gestion sobre el total de HH de produccion del proyecto, definidos por
 * Matias el 27-08-2026: JP 30%, Senior (DI/DG/Sop) 20/5/5%, Jefes de Area (TL, uno por
 * DI/DG/Sop) 5% cada uno. Reemplaza el cargo "GE" (gestor), que se elimina del proyecto.
 * Ajuste del mismo dia: Gestion queda EXCLUSIVAMENTE en modo porcentaje — se quita
 * "Bases Plantillas DG" (era de horas fijas, ya no tiene cabida en el modelo). */
export const gestionDefault = (): GestionRow[] => [
  cargoPorcentaje('Gestion JP', 30),
  cargoPorcentaje('Gestion DI Senior', 20),
  cargoPorcentaje('Gestion DG Senior', 5),
  cargoPorcentaje('Gestion Sop Senior', 5),
  cargoPorcentaje('Gestion DI TL', 5),
  cargoPorcentaje('Gestion DG TL', 5),
  cargoPorcentaje('Gestion Sop TL', 5),
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

/** Cargo nuevo agregado a mano ("+ Agregar cargo"): nace en 0% hasta que quien cubica
 * escriba el nombre y el porcentaje que corresponda. */
export const nuevaFilaGestion = (): GestionRow => cargoPorcentaje('', 0, true);
