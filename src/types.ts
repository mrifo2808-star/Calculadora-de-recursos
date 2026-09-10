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

/** 'fijo' = cantidad x factor(frecuencia) x hhUnitaria (igual que un recurso de
 * Cubicacion). 'porcentaje' = porcentaje fijo sobre el total de HH de produccion del
 * proyecto (recursos de Cubicacion, etapas activas, por curso — ver totalRecursosCurso
 * en calc.ts). */
export type TipoCargoGestion = 'fijo' | 'porcentaje';

export interface GestionRow {
  rowId: string;
  cargo: string;
  tipo: TipoCargoGestion;
  /** Solo aplica si tipo === 'fijo'. */
  cantidad: number;
  frecuencia: Frecuencia;
  hhUnitaria: number;
  /** 0-100. Solo aplica si tipo === 'porcentaje'. */
  porcentaje: number;
  /** false = cargo BASE (ver CARGOS_BASE_GESTION en data/plantilla.ts): va siempre en
   * todo proyecto, con el tipo/porcentaje definidos en el código — no se puede eliminar
   * ni editar su cargo/tipo/valor desde la interfaz, solo activar/desactivar. true =
   * cargo agregado por quien cubica: totalmente editable y eliminable. */
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
  /** Toggle «Incluir gestión docente (DI)» de la pestaña Cubicación: suma 0,5 HH por
   * curso por semana a la línea de DI (ver `calcularGestionDocente` en calc.ts). Apagado
   * por defecto. Ausente en estados guardados / Excel de antes de esta funcionalidad:
   * se trata como false (ver estadoInicial en App.tsx e importCubicacion.ts). */
  gestionDocente: boolean;
}
