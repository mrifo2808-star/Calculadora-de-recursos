import { FRECUENCIAS, type GestionRow, type ProduccionRow, type RecursoCatalogo } from '../types';
import { calcularProduccion } from '../calc';
import { fmt } from '../format';
import { CascadaSelector } from './CascadaSelector';
import { TablaGestion } from './TablaGestion';
import { ETAPA_GESTION, ETAPAS } from '../data/plantilla';

interface Props {
  rows: ProduccionRow[];
  nSemanas: number;
  catalogo: RecursoCatalogo[];
  etapasActivas: Record<string, boolean>;
  onToggleEtapa: (etapa: string) => void;
  onChange: (rows: ProduccionRow[]) => void;
  onAdd: (seccion: string) => void;
  gestionRows: GestionRow[];
  onChangeGestion: (rows: GestionRow[]) => void;
  onAddGestion: () => void;
}

const estadoClase: Record<string, string> = {
  OK: 'pill pill--ok',
  'PENDIENTE DE CATALOGAR': 'pill pill--pendiente',
  VACIA: 'pill pill--vacia',
};

/** Gestion del proyecto es, para efectos de visualizacion y toggle, una etapa mas dentro
 * del mismo listado — no un bloque fijo aparte. ETAPAS ya trae GESTION al final (ver
 * data/plantilla.ts), asi que por defecto queda como la ultima seccion de la lista. */
const etiquetaEtapa = (etapa: string): string => (etapa === ETAPA_GESTION ? 'Gestión del proyecto' : etapa);

export function TablaCubicacion({
  rows,
  nSemanas,
  catalogo,
  etapasActivas,
  onToggleEtapa,
  onChange,
  onAdd,
  gestionRows,
  onChangeGestion,
  onAddGestion,
}: Props) {
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
        catalogar». Desactiva una etapa completa (incluida «Gestión del proyecto») con su interruptor si el curso no
        la necesita: sus recursos dejan de sumar horas y desaparecen del cálculo.
      </p>
      {ETAPAS.map((etapa) => {
        const activa = etapasActivas[etapa] !== false;
        const esGestion = etapa === ETAPA_GESTION;
        const filas = esGestion ? [] : calculadas.filter((r) => r.seccion === etapa);
        const cabecera = (
          <div className="seccion__header">
            <h3>{etiquetaEtapa(etapa)}</h3>
            <label className="etapa-toggle">
              <input type="checkbox" checked={activa} onChange={() => onToggleEtapa(etapa)} />
              <span className="etapa-toggle__pista" aria-hidden="true" />
              <span className="etapa-toggle__texto">{activa ? 'Etapa activa' : 'Etapa desactivada'}</span>
            </label>
          </div>
        );

        if (!activa) {
          return (
            <div key={etapa} className="seccion seccion--desactivada">
              {cabecera}
              <p className="panel__hint">
                Etapa desactivada: sus {esGestion ? 'cargos' : 'recursos'} no se incluyen en el cálculo ni en la
                cubicación.
              </p>
            </div>
          );
        }

        if (esGestion) {
          return (
            <div key={etapa} className="seccion">
              {cabecera}
              <TablaGestion rows={gestionRows} nSemanas={nSemanas} onChange={onChangeGestion} onAdd={onAddGestion} />
            </div>
          );
        }

        if (etapa === 'RECURSOS ADICIONALES' && filas.length === 0) {
          return (
            <div key={etapa} className="seccion">
              {cabecera}
              <button type="button" className="btn-secundario" onClick={() => onAdd(etapa)}>
                + Agregar recurso
              </button>
            </div>
          );
        }
        return (
          <div key={etapa} className="seccion">
            {cabecera}
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
                          onChange={(e) => update(r.rowId, { cantidad: Math.max(0, Number(e.target.value)) })}
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
                            title="Eliminar fila (borrado permanente)"
                          >
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-secundario btn-secundario--sm" onClick={() => onAdd(etapa)}>
              + Agregar fila
            </button>
          </div>
        );
      })}
    </section>
  );
}
