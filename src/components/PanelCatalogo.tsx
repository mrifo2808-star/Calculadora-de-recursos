import { useMemo, useRef, useState } from 'react';
import { fmt } from '../format';
import { useCatalog } from '../CatalogContext';

const estadoClase: Record<string, string> = {
  Validado: 'pill pill--ok',
  Pendiente: 'pill pill--pendiente',
  Historico: 'pill pill--vacia',
};

export function PanelCatalogo() {
  const { catalogo, esPersonalizado, reemplazarCatalogo, restaurarCatalogoOriginal } = useCatalog();
  const [filtro, setFiltro] = useState('');
  const [soloValidados, setSoloValidados] = useState(true);
  const [mensajeImport, setMensajeImport] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [descargando, setDescargando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

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

  const elegirArchivo = () => inputArchivoRef.current?.click();

  const restaurarOriginal = () => {
    if (!confirm('Esto descarta el catálogo cargado desde Excel en este navegador y vuelve al catálogo original. ¿Continuar?')) return;
    restaurarCatalogoOriginal();
    setMensajeImport(null);
  };

  const cargarArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo si se corrige y reintenta
    if (!archivo) return;
    setCargando(true);
    try {
      const { catalogoDesdeArchivoExcel } = await import('../excelCatalogo');
      const resultado = await catalogoDesdeArchivoExcel(archivo);
      if (resultado.filasValidas === 0) {
        setMensajeImport({ tipo: 'error', texto: 'El archivo no tiene filas válidas (revisa columnas Tipo/Nombre visible).' });
        return;
      }
      reemplazarCatalogo(resultado.catalogo);
      const partes = [`${resultado.filasValidas} recursos cargados de ${resultado.filasLeidas} filas leídas.`];
      if (resultado.duplicadosFusionados > 0) partes.push(`${resultado.duplicadosFusionados} filas con ID repetido se fusionaron (quedó la última).`);
      if (resultado.erroresFila.length > 0) partes.push(`${resultado.erroresFila.length} advertencias: ${resultado.erroresFila.slice(0, 3).join(' ')}`);
      setMensajeImport({ tipo: resultado.erroresFila.length > 0 ? 'error' : 'ok', texto: partes.join(' ') });
    } catch {
      setMensajeImport({ tipo: 'error', texto: 'No se pudo leer el archivo. Verifica que sea un .xlsx exportado desde aquí o con las mismas columnas.' });
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Catálogo de tasas DI / DG / SOP</h2>
        <div className="panel__acciones">
          {esPersonalizado && (
            <button type="button" className="btn-secundario" onClick={restaurarOriginal}>
              Restaurar catálogo original
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={elegirArchivo} disabled={cargando}>
            {cargando ? 'Cargando…' : '⬆ Cargar catálogo actualizado (Excel)'}
          </button>
          <button type="button" className="btn-secundario" onClick={descargar} disabled={descargando}>
            {descargando ? 'Generando…' : '⬇ Descargar catálogo (Excel)'}
          </button>
          <input
            ref={inputArchivoRef}
            type="file"
            accept=".xlsx"
            onChange={cargarArchivo}
            style={{ display: 'none' }}
          />
        </div>
      </div>
      <p className="panel__hint">
        Fuente de verdad de tarifas (horas). Solo <strong>Validado</strong> es seleccionable en Cubicación (
        {validados} de {catalogo.length} recursos). Pendiente/Histórico quedan como referencia. Descarga el Excel,
        corrígelo (mismas columnas) y vuelve a cargarlo aquí — reemplaza el catálogo activo en este navegador sin
        tocar el código.
      </p>
      {esPersonalizado && (
        <p className="panel__hint panel__hint--aviso">
          Este catálogo fue reemplazado por un archivo cargado manualmente (se guarda solo en este navegador). El
          catálogo publicado en el repositorio no cambia hasta que alguien actualice{' '}
          <code>src/data/catalogo.ts</code> con estos mismos datos.
        </p>
      )}
      {mensajeImport && (
        <p className={`mensaje panel__hint ${mensajeImport.tipo === 'ok' ? 'panel__hint--ok' : 'panel__hint--aviso'}`}>
          <span>{mensajeImport.texto}</span>
          <button type="button" className="mensaje__cerrar" onClick={() => setMensajeImport(null)} aria-label="Cerrar mensaje">
            ✕
          </button>
        </p>
      )}
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
    </section>
  );
}
