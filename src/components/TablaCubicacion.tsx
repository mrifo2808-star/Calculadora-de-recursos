import { FRECUENCIAS, type ProduccionRow, type RecursoCatalogo } from '../types';
import { calcularProduccion } from '../calc';
import { fmt } from '../format';
import { CascadaSelector } from './CascadaSelector';
import { SECCIONES } from '../data/plantilla';

interface Props {
  rows: ProduccionRow[];
  nSemanas: number;
  catalogo: RecursoCatalogo[];
  onChange: (rows: ProduccionRow[]) => void;
  onAdd: (seccion: string) => void;
}

const estadoClase: Record<string, string> = {
  OK: 'pill pill--ok',
  'PENDIENTE DE CATALOGAR': 'pill pill--pendiente',
  VACIA: 'pill pill--vacia',
};

export function TablaCubicacion({ rows, nSemanas, catalogo, onChange, onAdd }: Props) {
  const calculadas = calcularProduccion(rows, nSemanas, catalogo);

  const update = (rowId: string, patch: Partial<ProduccionRow>) =>
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const remove = (rowId: string) => onChange(rows.filter((r) => r.rowId !== rowId));

  return (
    <section className="panel">
      <h2>Cubicación de recursos</h2>
      <p className="panel__hint">
        Elige Tipo y luego Recurso (el Recurso ya incluye la duración/extensión, ej. «Video After — 1 min»). Solo se
        muestran recursos <strong>Validados</strong> del catálogo. Sin selección completa, la fila queda «Pendiente de
        catalogar».
      </p>
      {SECCIONES.map((seccion) => {
        const filas = calculadas.filter((r) => r.seccion === seccion);
        if (seccion === 'RECURSOS ADICIONALES' && filas.length === 0) {
          return (
            <div key={seccion} className="seccion">
              <h3>{seccion}</h3>
              <button type="button" className="btn-secundario" onClick={() => onAdd(seccion)}>
                + Agregar recurso
              </button>
            </div>
          );
        }
        return (
          <div key={seccion} className="seccion">
            <h3>{seccion}</h3>
            <div className="tabla-scroll">
              <table className="tabla tabla--fija-primera">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th>Tipo / Recurso</th>
                    <th>Cantidad</th>
                    <th>Frecuencia</th>
                    <th>HH DI</th>
                    <th>HH DG</th>
                    <th>HH SOP</th>
                    <th>Total HH</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => (
                    <tr key={r.rowId}>
                      <td>
                        <input
                          type="text"
                          value={r.tarea}
                          onChange={(e) => update(r.rowId, { tarea: e.target.value })}
                          placeholder="Nombre de la tarea"
                          title={r.tarea}
                        />
                      </td>
                      <td>
                        <CascadaSelector
                          catalogo={catalogo}
                          recursoId={r.recursoId}
                          onChange={(id) => update(r.rowId, { recursoId: id })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={r.cantidad}
                          onChange={(e) => update(r.rowId, { cantidad: Number(e.target.value) })}
                          className="input-num"
                        />
                      </td>
                      <td>
                        <select
                          value={r.frecuencia}
                          onChange={(e) => update(r.rowId, { frecuencia: e.target.value as ProduccionRow['frecuencia'] })}
                        >
                          {FRECUENCIAS.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="num">{r.estado === 'OK' ? fmt(r.hhDI) : '—'}</td>
                      <td className="num">{r.estado === 'OK' ? fmt(r.hhDG) : '—'}</td>
                      <td className="num">{r.estado === 'OK' ? fmt(r.hhSOP) : '—'}</td>
                      <td className="num">{r.estado === 'OK' ? fmt(r.total) : '—'}</td>
                      <td>
                        <span className={estadoClase[r.estado]}>{r.estado}</span>
                      </td>
                      <td>
                        {r.removable && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => remove(r.rowId)}
                            aria-label="Eliminar fila"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-secundario btn-secundario--sm" onClick={() => onAdd(seccion)}>
              + Agregar fila
            </button>
          </div>
        );
      })}
    </section>
  );
}
