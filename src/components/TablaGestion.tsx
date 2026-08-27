import { FRECUENCIAS, type GestionRow, type TipoCargoGestion } from '../types';
import { calcularGestion } from '../calc';
import { fmt } from '../format';

interface Props {
  rows: GestionRow[];
  nSemanas: number;
  /** Total de HH de produccion del proyecto (etapas activas, por curso) — base de los
   * cargos tipo 'porcentaje'. Lo calcula App.tsx una sola vez (ver calc.ts,
   * totalRecursosCurso) para que este preview en vivo y el Resumen final coincidan
   * siempre. */
  baseGestionHH: number;
  onChange: (rows: GestionRow[]) => void;
  onAdd: () => void;
}

const TIPOS_CARGO: { value: TipoCargoGestion; label: string }[] = [
  { value: 'porcentaje', label: '% Proyecto' },
  { value: 'fijo', label: 'Fijo' },
];

const LOCK_TITLE = 'Cargo base: definido en el código, no editable desde la interfaz. Se puede activar/desactivar.';

/** Contenido de la "etapa" Gestion del proyecto dentro del listado de secciones de
 * Cubicacion (ver TablaCubicacion): sin envoltorio de panel/encabezado/toggle propios —
 * el padre ya la renderiza como una seccion mas y solo la monta cuando esta activa.
 *
 * Dos clases de fila, distinguidas por `removable`:
 * - `removable === false`: cargo BASE (ver CARGOS_BASE_GESTION en data/plantilla.ts) —
 *   siempre presente, de solo lectura salvo el interruptor Activa/eliminar (que no
 *   tiene, no se puede eliminar). Su cargo/tipo/porcentaje solo se cambian en el código.
 * - `removable === true`: cargo agregado a mano ("+ Agregar cargo") — totalmente
 *   editable (cargo, Tipo Fijo/% Proyecto y los campos que correspondan) y eliminable.
 */
export function TablaGestion({ rows, nSemanas, baseGestionHH, onChange, onAdd }: Props) {
  const calculadas = calcularGestion(rows, nSemanas, baseGestionHH);
  // Las filas desactivadas se muestran (atenuadas) pero no suman al total, igual que en
  // el Resumen general y en la exportacion a Excel.
  const totalGestion = calculadas.filter((r) => r.activa !== false).reduce((a, r) => a + r.total, 0);

  const update = (rowId: string, patch: Partial<GestionRow>) =>
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const remove = (rowId: string) => onChange(rows.filter((r) => r.rowId !== rowId));

  return (
    <>
      <p className="panel__hint">
        Los 7 cargos base (JP, Senior, Jefes de Área) van siempre en el proyecto, con el porcentaje definido en el
        código — no son editables ni eliminables desde acá, solo se pueden activar/desactivar. «+ Agregar cargo» suma
        uno nuevo, ese sí editable: elige si es <strong>% Proyecto</strong> (porcentaje fijo del total de HH de
        producción, hoy {fmt(baseGestionHH)} HH) o <strong>Fijo</strong> (Cantidad × Frecuencia × HH unitaria, igual
        que un recurso de Cubicación).
      </p>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Cargo</th>
              <th scope="col">Tipo</th>
              <th scope="col">Cantidad</th>
              <th scope="col">Frecuencia</th>
              <th scope="col">HH unitarias</th>
              <th scope="col">% proyecto</th>
              <th scope="col">Total HH</th>
              <th scope="col" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {calculadas.map((r) => {
              const base = r.removable === false;
              const esFijo = r.tipo === 'fijo';
              return (
                <tr key={r.rowId} className={r.activa === false ? 'fila--desactivada' : undefined}>
                  <td>
                    {base ? (
                      <span title={LOCK_TITLE}>{r.cargo}</span>
                    ) : (
                      <input
                        type="text"
                        value={r.cargo}
                        onChange={(e) => update(r.rowId, { cargo: e.target.value })}
                        placeholder="Nombre del cargo"
                      />
                    )}
                  </td>
                  <td>
                    {base ? (
                      <span title={LOCK_TITLE}>% Proyecto</span>
                    ) : (
                      <select value={r.tipo} onChange={(e) => update(r.rowId, { tipo: e.target.value as TipoCargoGestion })}>
                        {TIPOS_CARGO.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className={!base && esFijo ? undefined : 'num'}>
                    {!base && esFijo ? (
                      <input
                        type="number"
                        min={0}
                        value={r.cantidad}
                        onChange={(e) => update(r.rowId, { cantidad: Math.max(0, Number(e.target.value)) })}
                        className="input-num"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={!base && esFijo ? undefined : 'num'}>
                    {!base && esFijo ? (
                      <select
                        value={r.frecuencia}
                        onChange={(e) => update(r.rowId, { frecuencia: e.target.value as GestionRow['frecuencia'] })}
                      >
                        {FRECUENCIAS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={!base && esFijo ? undefined : 'num'}>
                    {!base && esFijo ? (
                      <input
                        type="number"
                        min={0}
                        step={0.05}
                        value={r.hhUnitaria}
                        onChange={(e) => update(r.rowId, { hhUnitaria: Number(e.target.value) })}
                        className="input-num"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className={base || esFijo ? 'num' : undefined}>
                    {base ? (
                      <span title={LOCK_TITLE}>{fmt(r.porcentaje)}%</span>
                    ) : esFijo ? (
                      '—'
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={r.porcentaje}
                        onChange={(e) => update(r.rowId, { porcentaje: Math.max(0, Number(e.target.value)) })}
                        className="input-num"
                        aria-label={`Porcentaje del proyecto para ${r.cargo || 'este cargo'}`}
                      />
                    )}
                  </td>
                  <td className="num">{fmt(r.total)}</td>
                  <td className="fila-acciones">
                    <label className="fila-toggle" title={r.activa === false ? 'Activar fila' : 'Desactivar fila'}>
                      <input
                        type="checkbox"
                        checked={r.activa !== false}
                        onChange={() => update(r.rowId, { activa: r.activa === false })}
                      />
                      <span className="fila-toggle__pista" aria-hidden="true" />
                    </label>
                    {r.removable && (
                      <button type="button" className="btn-icon" onClick={() => remove(r.rowId)} aria-label="Eliminar fila">
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>Total HH Gestión (por curso)</td>
              <td className="num">{fmt(totalGestion)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" className="btn-secundario btn-secundario--sm" onClick={onAdd}>
        + Agregar cargo
      </button>
    </>
  );
}
