import type { GestionRow } from '../types';
import { calcularGestion } from '../calc';
import { fmt } from '../format';

interface Props {
  rows: GestionRow[];
  /** Total de HH de produccion del proyecto (etapas activas, por curso) — base de todo
   * cargo de Gestion. Lo calcula App.tsx una sola vez (ver calc.ts, totalRecursosCurso)
   * para que este preview en vivo y el Resumen final coincidan siempre. */
  baseGestionHH: number;
  onChange: (rows: GestionRow[]) => void;
  onAdd: () => void;
}

/** Contenido de la "etapa" Gestion del proyecto dentro del listado de secciones de
 * Cubicacion (ver TablaCubicacion): sin envoltorio de panel/encabezado/toggle propios —
 * el padre ya la renderiza como una seccion mas y solo la monta cuando esta activa.
 *
 * Cada cargo es siempre un porcentaje fijo del total de HH de produccion del proyecto
 * (`baseGestionHH`) — no existe una modalidad de horas fijas ni cantidad/frecuencia
 * propias de Gestion. */
export function TablaGestion({ rows, baseGestionHH, onChange, onAdd }: Props) {
  const calculadas = calcularGestion(rows, baseGestionHH);
  // Las filas desactivadas se muestran (atenuadas) pero no suman al total, igual que en
  // el Resumen general y en la exportacion a Excel.
  const totalGestion = calculadas.filter((r) => r.activa !== false).reduce((a, r) => a + r.total, 0);

  const update = (rowId: string, patch: Partial<GestionRow>) =>
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));

  const remove = (rowId: string) => onChange(rows.filter((r) => r.rowId !== rowId));

  return (
    <>
      <p className="panel__hint">
        Cargos del proyecto (JP, Senior, Jefes de Área, etc.), separados de producción. No consumen catálogo de
        recursos. Se reutilizan entre proyectos, por eso cada fila se desactiva en vez de eliminarse. Las HH de cada
        cargo son un <strong>% fijo del total de HH de producción</strong> del proyecto (recursos de Cubicación,
        etapas activas, por curso — hoy {fmt(baseGestionHH)} HH) y se recalculan solas cada vez que ese total cambia.
        «+ Agregar cargo» suma un cargo nuevo con su propio porcentaje.
      </p>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Cargo</th>
              <th scope="col">% proyecto</th>
              <th scope="col">Total HH</th>
              <th scope="col" aria-label="Acciones" />
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
                    step={0.5}
                    value={r.porcentaje}
                    onChange={(e) => update(r.rowId, { porcentaje: Math.max(0, Number(e.target.value)) })}
                    className="input-num"
                    aria-label={`Porcentaje del proyecto para ${r.cargo || 'este cargo'}`}
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
              <td>Total HH Gestión (por curso)</td>
              <td />
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
