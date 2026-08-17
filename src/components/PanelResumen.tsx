import type { Resumen } from '../calc';
import { fmt } from '../format';

interface Props {
  resumen: Resumen;
  nCursos: number;
}

export function PanelResumen({ resumen, nCursos }: Props) {
  return (
    <section className="panel">
      <h2>Resumen de cubicación</h2>

      <div className="tarjetas">
        <div className="tarjeta">
          <span className="tarjeta__label">HH DI / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.hhDICurso)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH DG / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.hhDGCurso)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH SOP / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.hhSOPCurso)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">Total HH recursos / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.totalRecursosCurso)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH gestión / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.hhGestionCurso)}</span>
        </div>
        <div className="tarjeta tarjeta--destacada">
          <span className="tarjeta__label">Total general HH / curso</span>
          <span className="tarjeta__valor">{fmt(resumen.totalGeneralCurso)}</span>
        </div>
      </div>

      <h3>Subtotales por sección (por curso)</h3>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Sección</th>
              <th>Total HH</th>
            </tr>
          </thead>
          <tbody>
            {resumen.subtotalesPorSeccion.map((s) => (
              <tr key={s.seccion}>
                <td>{s.seccion}</td>
                <td className="num">{fmt(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Totales del proyecto (x {nCursos} curso{nCursos === 1 ? '' : 's'})</h3>
      <div className="tarjetas">
        <div className="tarjeta">
          <span className="tarjeta__label">HH DI total</span>
          <span className="tarjeta__valor">{fmt(resumen.hhDIProyecto)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH DG total</span>
          <span className="tarjeta__valor">{fmt(resumen.hhDGProyecto)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH SOP total</span>
          <span className="tarjeta__valor">{fmt(resumen.hhSOPProyecto)}</span>
        </div>
        <div className="tarjeta">
          <span className="tarjeta__label">HH gestión total</span>
          <span className="tarjeta__valor">{fmt(resumen.hhGestionProyecto)}</span>
        </div>
        <div className="tarjeta tarjeta--destacada">
          <span className="tarjeta__label">TOTAL GENERAL HH PROYECTO</span>
          <span className="tarjeta__valor">{fmt(resumen.totalGeneralProyecto)}</span>
        </div>
      </div>

      <h3>Estado de la selección</h3>
      <ul className="lista-estado">
        <li>
          Recursos seleccionados (Tipo elegido): <strong>{resumen.recursosSeleccionados}</strong>
        </li>
        <li>
          Recursos validados (OK): <strong>{resumen.recursosOk}</strong>
        </li>
        <li>
          Pendientes de catalogar (sin insumo): <strong>{resumen.pendientesDeCatalogar}</strong>
        </li>
        <li>
          Cubicación completa:{' '}
          <span className={resumen.cubicacionCompleta ? 'pill pill--ok' : 'pill pill--pendiente'}>
            {resumen.cubicacionCompleta ? 'SÍ' : 'NO'}
          </span>
        </li>
      </ul>
    </section>
  );
}
