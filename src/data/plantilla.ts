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
 * ORIGEN DE LOS PORCENTAJES (10-09-2026) — modelo de estimación institucional
 * `MODELO_ESTIMACION_v02.00.xlsx`. Cada porcentaje es las HH que el modelo cubica para
 * ese rol, divididas por las 3.121,61 HH de trabajo productivo de su proyecto de
 * referencia (3.500 HH nominales en 16 semanas):
 *
 *     JP      108,75 HH / 3.121,61 = 3,48 %      DI TL    39,375 HH = 1,26 %
 *     DI S    161,25 HH            = 5,17 %      DG TL    30 HH     = 0,96 %
 *     DG S     56,25 HH            = 1,80 %      Sop TL   30 HH     = 0,96 %
 *     Sop S    56,25 HH            = 1,80 %
 *                                   ----------------------------------------
 *     Total   481,875 HH / 3.121,61 = 15,4367 %  → 15,43 % sumando los redondeos
 *
 * OJO con la base: el divisor es 3.121,61 HH de PRODUCCIÓN, no las 3.500 HH nominales
 * del proyecto de referencia. Una cubicación con 3.121,61 HH de producción da ≈481,7 HH
 * de gestión (las 481,875 del modelo, salvo redondeo); una con 3.500 HH da ≈540 HH.
 *
 * Estos porcentajes REEMPLAZAN a los definidos a ojo por Matías el 27-08-2026 (JP 30 %,
 * Senior DI/DG/Sop 20/5/5 %, TL DI/DG/Sop 5 % c/u = 75 % del total de producción), que
 * estaban casi 5× por sobre el modelo institucional. Toda cubicación hecha antes de
 * este cambio arroja ahora un total menor — ver VALIDAR-gestion-modelo-institucional-20260910.md.
 *
 * Los cargos base además se ajustan por la duración del proyecto (ver
 * `factorDuracionGestion` en calc.ts): estos porcentajes son los del proyecto de
 * referencia de 16 semanas, donde ese factor vale exactamente 1.
 * ========================================================================== */
export const CARGOS_BASE_GESTION: readonly { cargo: string; porcentaje: number }[] = [
  { cargo: 'Gestion JP', porcentaje: 3.48 },
  { cargo: 'Gestion DI Senior', porcentaje: 5.17 },
  { cargo: 'Gestion DG Senior', porcentaje: 1.8 },
  { cargo: 'Gestion Sop Senior', porcentaje: 1.8 },
  { cargo: 'Gestion DI TL', porcentaje: 1.26 },
  { cargo: 'Gestion DG TL', porcentaje: 0.96 },
  { cargo: 'Gestion Sop TL', porcentaje: 0.96 },
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
 * ese nombre, para no perder el estado de activación de quien cubica.
 *
 * `removable === false` es el marcador de "esto lo generó el sistema como cargo base"
 * en TODA la historia de este archivo (gestionDefault/cargoFijo/cargoPorcentaje/
 * cargoBase siempre lo pusieron así; nuevaFilaGestion siempre usa `true`). Por eso una
 * fila `removable === false` cuyo nombre YA NO está en `CARGOS_BASE_GESTION` no es un
 * cargo agregado a mano — es un cargo base de una versión anterior del código (medio
 * renombrado, por ejemplo "Gestion QA TL" antes de renombrarse a "Gestion Sop TL", o
 * un cargo cuyo nombre alguien editó cuando esa columna todavía era editable) que quedó
 * huérfano: no calza con ningún nombre actual, así que nunca se reemplaza arriba, y al
 * no ser removable tampoco tiene botón "✕" para que quien cubica lo saque a mano. Se
 * descarta acá — es la única forma de limpiarlo. Un cargo agregado a mano de verdad
 * (`removable === true`) nunca se toca, sin importar su nombre.
 */
export function reconciliarGestionBase(gestion: GestionRow[]): GestionRow[] {
  const nombresBase = new Set(CARGOS_BASE_GESTION.map((c) => c.cargo));
  const base = CARGOS_BASE_GESTION.map((c) => {
    const existente = gestion.find((g) => g.cargo === c.cargo);
    return cargoBase(c.cargo, c.porcentaje, existente?.rowId, existente?.activa);
  });
  const extras = gestion.filter((g) => !nombresBase.has(g.cargo) && g.removable !== false);
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
