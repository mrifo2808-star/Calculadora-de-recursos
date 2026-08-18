export type EstadoCatalogo = 'Validado' | 'Pendiente' | 'Historico';

export interface RecursoCatalogo {
  id: string;
  estado: EstadoCatalogo;
  tipo: string;
  nombreVisible: string;
  extension: string;
  unidad: string;
  di: number | null;
  dg: number | null;
  sop: number | null;
  fuente: string;
  observaciones: string;
}

export type Frecuencia = 'Por curso' | 'Por semana' | 'Por unidad' | 'Fijo';

export const FRECUENCIAS: Frecuencia[] = ['Por curso', 'Por semana', 'Por unidad', 'Fijo'];

export interface ProduccionRow {
  rowId: string;
  seccion: string;
  tarea: string;
  recursoId: string | null;
  cantidad: number;
  frecuencia: Frecuencia;
  /** true only for rows the user added themselves (can be deleted) */
  removable: boolean;
}

export interface GestionRow {
  rowId: string;
  cargo: string;
  cantidad: number;
  frecuencia: Frecuencia;
  hhUnitaria: number;
  removable: boolean;
  /** false = fila desactivada: se conserva pero se excluye del calculo de totales.
   * Ausente (filas guardadas antes de esta funcionalidad) se trata como true. */
  activa: boolean;
}

export interface ParametrosCurso {
  proyecto: string;
  cliente: string;
  nCursos: number;
  nSemanas: number;
  modalidad: string;
}
