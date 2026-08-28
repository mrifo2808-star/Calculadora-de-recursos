import { useMemo, useState } from 'react';
import { fmt } from '../format';
import { useCatalog } from '../CatalogContext';
import { useConfirm } from '../ConfirmModal';

const estadoClase: Record<string, string> = {
  Validado: 'pill pill--ok',
  Pendiente: 'pill pill--pendiente',
  Historico: 'pill pill--vacia',
};

/** "hace 5 min" / "hace 3 h" / "hace 2 d" — sin librería, solo lo que necesita este panel. */
function haceTiempo(fecha: Date): string {
  const segundos = Math.max(0, (Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) return 'hace un momento';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} d`;
}

export function PanelCatalogo() {
  const {
    catalogo,
    cargando,
    error,
    fuenteRemota,
    restaurarCatalogoOriginal,
    catalogoWorkerConfigurado,
    sincronizando,
    ultimaSincronizacion,
    errorSincronizacion,
    sincronizarDesdeSharePoint,
  } = useCatalog();
  const confirmar = useConfirm();
  const [filtro, setFiltro] = useState('');
  const [soloValidados, setSoloValidados] = useState(true);
  const [mensajeImport, setMensajeImport] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const filas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return catalogo.filter((r) => {
      if (soloValidados && r.estado !== 'Validado') return false;
      if (!q) return true;
      return `${r.tipo} ${r.nombreVisible} ${r.extension}`.toLowerCase().includes(q);
    });
  }, [catalogo, filtro, soloValidados]);

  const validados = catalogo.filter((r) => r.estado === 'Validado').length;

  const descargar = async () => {
    setDescargando(true);
    try {
      const { descargarCatalogoExcel } = await import('../excelCatalogo');
      descargarCatalogoExcel(catalogo);
    } finally {
      setDescargando(false);
    }
  };

  const restaurarOriginal = async () => {
    const ok = await confirmar(
      'Esto reemplaza el catálogo COMPARTIDO por el catálogo de referencia incorporado en el código, para TODO el equipo. ' +
        'Es una salida de emergencia — úsala solo si el catálogo compartido quedó en mal estado (por ejemplo, una sincronización con datos corruptos). ' +
        'No reemplaza la actualización normal desde SharePoint. ¿Continuar?',
      { titulo: 'Restaurar catálogo original (emergencia)', textoConfirmar: 'Restaurar' },
    );
    if (!ok) return;
    setRestaurando(true);
    const resultado = await restaurarCatalogoOriginal();
    setRestaurando(false);
    setMensajeImport(
      resultado.ok
        ? { tipo: 'ok', texto: 'Catálogo compartido restaurado al de referencia.' }
        : { tipo: 'error', texto: `No se pudo restaurar: ${resultado.error}` },
    );
  };

  const actualizarDesdeSharePoint = async () => {
    await sincronizarDesdeSharePoint(true);
  };

  const accionesDeshabilitadas = !fuenteRemota || restaurando;

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Catálogo de tasas DI / DG / SOP</h2>
        <div className="panel__acciones">
          {catalogoWorkerConfigurado && (
            <button type="button" className="btn-secundario" onClick={actualizarDesdeSharePoint} disabled={accionesDeshabilitadas || sincronizando}>
              {sincronizando ? 'Sincronizando…' : '🔄 Actualizar catálogo (SharePoint)'}
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={descargar} disabled={descargando}>
            {descargando ? 'Generando…' : '⬇ Descargar catálogo (Excel)'}
          </button>
        </div>
      </div>
      <p className="panel__hint">
        Fuente de verdad de tarifas (horas). Solo <strong>Validado</strong> es seleccionable en Cubicación (
        {validados} de {catalogo.length} recursos). Pendiente/Histórico quedan como referencia.
        {catalogoWorkerConfigurado
          ? ' El catálogo compartido se sincroniza solo desde el Excel de SharePoint cada ~12 h; «Actualizar catálogo» lo fuerza ahora mismo. Ya no hay carga manual de un Excel: SharePoint es la única vía de actualización.'
          : ' Este build no tiene configurada la sincronización con SharePoint (falta VITE_CATALOGO_WORKER_URL).'}
        {' '}«Descargar catálogo» solo genera una copia de lectura, no lo actualiza.
      </p>
      {cargando && (
        <p className="panel__hint" role="status">
          Cargando catálogo compartido…
        </p>
      )}
      {error && (
        <p className="panel__hint panel__hint--aviso" role="alert">
          {error}
        </p>
      )}
      {!cargando && !error && fuenteRemota && (
        <p className="panel__hint panel__hint--ok" role="status">
          Catálogo sincronizado en vivo con el equipo (Supabase). Un cambio acá lo ven todos al instante.
        </p>
      )}
      {catalogoWorkerConfigurado && sincronizando && (
        <p className="panel__hint" role="status">
          Sincronizando catálogo desde SharePoint…
        </p>
      )}
      {catalogoWorkerConfigurado && errorSincronizacion && !sincronizando && (
        <p className="panel__hint panel__hint--aviso" role="alert">
          {errorSincronizacion} El catálogo que ves abajo es el último cargado con éxito, no se vació.
        </p>
      )}
      {catalogoWorkerConfigurado && !sincronizando && !errorSincronizacion && ultimaSincronizacion && (
        <p className="panel__hint panel__hint--ok" role="status">
          Última actualización desde SharePoint: {haceTiempo(ultimaSincronizacion)}.
        </p>
      )}
      {mensajeImport && (
        <p
          className={`mensaje panel__hint ${mensajeImport.tipo === 'ok' ? 'panel__hint--ok' : 'panel__hint--aviso'}`}
          role={mensajeImport.tipo === 'error' ? 'alert' : 'status'}
        >
          <span>{mensajeImport.texto}</span>
          <button type="button" className="mensaje__cerrar" onClick={() => setMensajeImport(null)} aria-label="Cerrar mensaje">
            ✕
          </button>
        </p>
      )}
      <div className="catalogo-filtros">
        <input
          type="search"
          aria-label="Buscar en el catálogo"
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
              <th scope="col">Estado</th>
              <th scope="col">Tipo</th>
              <th scope="col">Nombre visible</th>
              <th scope="col">Extensión</th>
              <th scope="col">Unidad</th>
              <th scope="col">DI (HH)</th>
              <th scope="col">DG (HH)</th>
              <th scope="col">SOP (HH)</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={8} className="tabla__vacio">
                  Ningún recurso coincide con «{filtro}»{soloValidados ? ' entre los validados' : ''}.
                </td>
              </tr>
            ) : (
              filas.map((r) => (
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
              ))
            )}
          </tbody>
        </table>
      </div>
      <details className="catalogo-emergencia">
        <summary>Opciones de emergencia</summary>
        <p className="panel__hint panel__hint--aviso">
          «Restaurar catálogo original» reemplaza el catálogo COMPARTIDO por el catálogo de referencia incorporado en
          el código, para TODO el equipo. Es una salida de emergencia — úsala solo si el catálogo compartido quedó en
          mal estado (por ejemplo, una sincronización con datos corruptos). No reemplaza la actualización normal
          desde SharePoint.
        </p>
        <button type="button" className="btn-secundario" onClick={restaurarOriginal} disabled={accionesDeshabilitadas}>
          {restaurando ? 'Restaurando…' : '⚠ Restaurar catálogo original'}
        </button>
      </details>
    </section>
  );
}
