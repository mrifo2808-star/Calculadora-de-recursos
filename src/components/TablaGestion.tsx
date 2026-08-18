import { FRECUENCIAS, type GestionRow } from '../types';
import { calcularGestion } from '../calc';
import { fmt } from '../format';

interface Props {
  rows: GestionRow[];
  nSemanas: number;
  onChange: (rows: GestionRow[]) => void;
  onAdd: () => void;
}

/** Contenido de la "etapa" Gestion del proyecto dentro del listado de secciones de
 * Cubicacion (ver TablaCubicacion): sin envoltorio de panel/encabezado/toggle propios —
 * el padre ya la renderiza como una seccion mas y solo la monta cuando esta activa. */
export function TablaGestion({ rows, nSemanas, onChange, onAdd }: Props) {
  const calculadas = calcularGestion(rows, nSemanas);
  // Las filas desactivadas se muestran (atenuadas) pero no suman al total, igual que en
  // el Resumen general y en la exportacion a Excel.
  const totalGestion = calculadas.filter((r) => r.activa !== false).reduce((a, r) => a + r.total, 0);

  const update = (rowId: string, patch: Partial<GestionRow>) =>
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const remove = (rowId: string) => onChange(rows.filter((r) => r.rowId !== rowId));

  return (
    <>
      <p className="panel__hint">
        Cargos del proyecto (JP, GE, TLs, etc.), separados de producción. No consumen catálogo de recursos. Se
        reutilizan entre proyectos, por eso cada fila se desactiva en vez de eliminarse.
      </p>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cargo</th>
              <th>Cantidad</th>
              <th>Frecuencia</th>
              <th>HH unitarias</th>
              <th>Total HH</th>
              <th aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {calculadas.map((r) => (
              <tr key={r.rowId} className={r.activa === false ? 'fila--desactivada' : undefined}>
                <td>
                  <input
                    type="text"
                    value={r.cargo}
                    onChange={(e) => update(r.rowId, { cargo: e.target.value })}
                    placeholder="Nombre del cargo"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    value={r.cantidad}
                    onChange={(e) => update(r.rowId, { cantidad: Math.max(0, Number(e.target.value)) })}
                    className="input-num"
                  />
                </td>
                <td>
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
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={0.05}
                    value={r.hhUnitaria}
                    onChange={(e) => update(r.rowId, { hhUnitaria: Number(e.target.value) })}
                    className="input-num"
                  />
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
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4}>Total HH Gestión (por curso)</td>
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
