import { useMemo, useState } from 'react';
import { CATALOGO } from '../data/catalogo';
import { fmt } from '../format';
import { catalogoACSV, descargarCSV } from '../export';

const estadoClase: Record<string, string> = {
  Validado: 'pill pill--ok',
  Pendiente: 'pill pill--pendiente',
  Historico: 'pill pill--vacia',
};

export function PanelCatalogo() {
  const [filtro, setFiltro] = useState('');
  const [soloValidados, setSoloValidados] = useState(true);

  const filas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return CATALOGO.filter((r) => {
      if (soloValidados && r.estado !== 'Validado') return false;
      if (!q) return true;
      return `${r.tipo} ${r.nombreVisible} ${r.extension}`.toLowerCase().includes(q);
    });
  }, [filtro, soloValidados]);

  const validados = CATALOGO.filter((r) => r.estado === 'Validado').length;

  const descargar = () => {
    const fecha = new Date().toISOString().slice(0, 10);
    descargarCSV(`catalogo-welearn-${fecha}.csv`, catalogoACSV(CATALOGO));
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Catálogo de tasas DI / DG / SOP</h2>
        <button type="button" className="btn-secundario" onClick={descargar}>
          ⬇ Descargar catálogo (CSV)
        </button>
      </div>
      <p className="panel__hint">
        Fuente de verdad de tarifas (horas). Solo <strong>Validado</strong> es seleccionable en Cubicación (
        {validados} de {CATALOGO.length} recursos). Pendiente/Histórico quedan como referencia. Descarga el CSV para
        revisar o corregir tarifas fuera de la app (Excel/Sheets) — ver README para cómo reincorporar los cambios.
      </p>
      <div className="catalogo-filtros">
        <input
          type="search"
          placeholder="Buscar tipo, recurso o extensión…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
        <label className="checkbox">
          <input type="checkbox" checked={soloValidados} onChange={(e) => setSoloValidados(e.target.checked)} />
          Solo validados
        </label>
      </div>
      <div className="tabla-scroll">
        <table className="tabla">
          <thead>
            <tr>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Nombre visible</th>
              <th>Extensión</th>
              <th>Unidad</th>
              <th>DI (HH)</th>
              <th>DG (HH)</th>
              <th>SOP (HH)</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className={estadoClase[r.estado]}>{r.estado}</span>
                </td>
                <td>{r.tipo}</td>
                <td>{r.nombreVisible}</td>
                <td>{r.extension}</td>
                <td>{r.unidad}</td>
                <td className="num">{r.di != null ? fmt(r.di) : '—'}</td>
                <td className="num">{r.dg != null ? fmt(r.dg) : '—'}</td>
                <td className="num">{r.sop != null ? fmt(r.sop) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
