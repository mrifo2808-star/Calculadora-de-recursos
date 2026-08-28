import { useRef, useState, type ChangeEvent } from 'react';
import type { GestionRow, ParametrosCurso, ProduccionRow } from '../types';
import { useCatalog } from '../CatalogContext';
import { useConfirm } from '../ConfirmModal';
// Import de tipos solamente (se borra en compilacion): el modulo real (que carga xlsx,
// ~500 KB) se trae con import() dinamico recien al elegir un archivo, igual que
// exportCubicacion.ts/excelCatalogo.ts — no debe quedar en el bundle principal.
import type { ConteoDiff, ResultadoImportacion } from '../importCubicacion';

interface Props {
  parametros: ParametrosCurso;
  onChange: (p: ParametrosCurso) => void;
  onReset: () => void;
  onExport: () => void;
  exportando: boolean;
  /** Estado actual (sin filtrar por etapa activa) — solo para calcular el resumen de
   * "nuevas/cambiadas/eliminadas" antes de importar, ver PreviewImportacion. */
  gestionActual: GestionRow[];
  produccionActual: ProduccionRow[];
  /** Reemplaza parametros/gestion/produccion en el estado global (App.tsx) — ya
   * confirmado por el usuario en el preview, listo para aplicar. */
  onImportado: (datos: { parametros: ParametrosCurso; gestion: GestionRow[]; produccion: ProduccionRow[] }) => void;
  /** Este panel se renderiza en TODAS las vistas (Cubicación, Catálogo, Resumen,
   * Instrucciones) porque los campos de parámetros (Proyecto/Cliente/etc.) son
   * relevantes en cualquiera. Pero Exportar/Importar/Restaurar plantilla son acciones
   * de la CUBICACIÓN — mostrarlas siempre, junto a los botones de Excel del Catálogo
   * (otro dominio, ver PanelCatalogo.tsx), confunde cuál botón hace qué. Se muestran
   * solo con la vista Cubicación activa. */
  mostrarAcciones: boolean;
}

function PreviewImportacion({
  resultado,
  diffProduccion,
  diffGestion,
}: {
  resultado: ResultadoImportacion;
  diffProduccion: ConteoDiff;
  diffGestion: ConteoDiff;
}) {
  const MAX_LISTA = 6;
  return (
    <div>
      <p>
        Esto reemplaza los parámetros, la gestión y la cubicación actuales por los del archivo «
        {resultado.parametros.proyecto || '(sin nombre de proyecto)'}».
      </p>
      <p>
        <strong>Cubicación:</strong> {diffProduccion.nuevas} nueva(s), {diffProduccion.cambiadas} cambiada(s),{' '}
        {diffProduccion.sinCambios} sin cambios, {diffProduccion.eliminadas} se eliminarán.
      </p>
      <p>
        <strong>Gestión:</strong> {diffGestion.nuevas} nueva(s), {diffGestion.cambiadas} cambiada(s),{' '}
        {diffGestion.sinCambios} sin cambios, {diffGestion.eliminadas} se eliminarán.
      </p>
      {resultado.rechazadas.length > 0 && (
        <>
          <p>{resultado.rechazadas.length} fila(s) del archivo se omiten (sin datos suficientes para importarse):</p>
          <ul>
            {resultado.rechazadas.slice(0, MAX_LISTA).map((r, i) => (
              <li key={i}>
                {r.hoja}, fila {r.fila}: {r.motivo}
              </li>
            ))}
            {resultado.rechazadas.length > MAX_LISTA && <li>… y {resultado.rechazadas.length - MAX_LISTA} más.</li>}
          </ul>
        </>
      )}
      {resultado.avisos.length > 0 && (
        <>
          <p>{resultado.avisos.length} advertencia(s) — se importan igual, con un valor corregido:</p>
          <ul>
            {resultado.avisos.slice(0, MAX_LISTA).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
            {resultado.avisos.length > MAX_LISTA && <li>… y {resultado.avisos.length - MAX_LISTA} más.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

export function PanelParametros({
  parametros,
  onChange,
  onReset,
  onExport,
  exportando,
  gestionActual,
  produccionActual,
  onImportado,
  mostrarAcciones,
}: Props) {
  const set = <K extends keyof ParametrosCurso>(key: K, value: ParametrosCurso[K]) =>
    onChange({ ...parametros, [key]: value });

  const { catalogo } = useCatalog();
  const confirmar = useConfirm();
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);
  const [mensajeImport, setMensajeImport] = useState<{ tipo: 'ok' | 'aviso' | 'error'; texto: string } | null>(null);

  const elegirArchivo = () => inputArchivoRef.current?.click();

  const seleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    // Se limpia de inmediato para poder reimportar el mismo archivo dos veces seguidas
    // (si no, onChange no vuelve a dispararse al elegir el mismo nombre de archivo).
    e.target.value = '';
    if (!archivo) return;

    setImportando(true);
    setMensajeImport(null);
    try {
      const { leerCubicacionExcel, compararProduccion, compararGestion } = await import('../importCubicacion');
      const resultado = await leerCubicacionExcel(archivo, catalogo);
      const diffProduccion = compararProduccion(produccionActual, resultado.produccion);
      const diffGestion = compararGestion(gestionActual, resultado.gestion);

      const ok = await confirmar(
        <PreviewImportacion resultado={resultado} diffProduccion={diffProduccion} diffGestion={diffGestion} />,
        { titulo: 'Importar desde Excel', textoConfirmar: 'Importar y reemplazar' },
      );
      if (!ok) return; // cancelado: nada se toco (el parseo no modifica estado por si solo)

      onImportado({ parametros: resultado.parametros, gestion: resultado.gestion, produccion: resultado.produccion });

      const partes = [`Importado: ${resultado.produccion.length} filas de cubicación, ${resultado.gestion.length} de gestión.`];
      if (resultado.rechazadas.length > 0) partes.push(`${resultado.rechazadas.length} fila(s) omitida(s) por falta de datos.`);
      if (resultado.avisos.length > 0) partes.push(`${resultado.avisos.length} advertencia(s) corregidas automáticamente.`);
      setMensajeImport({
        tipo: resultado.rechazadas.length > 0 || resultado.avisos.length > 0 ? 'aviso' : 'ok',
        texto: partes.join(' '),
      });
    } catch (err) {
      setMensajeImport({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo leer el archivo.' });
    } finally {
      setImportando(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Parámetros del proyecto</h2>
        {mostrarAcciones && (
          <div className="panel__acciones">
            <button type="button" className="btn-secundario" onClick={onExport} disabled={exportando}>
              {exportando ? 'Generando…' : '⬇ Exportar a Excel'}
            </button>
            <button type="button" className="btn-secundario" onClick={elegirArchivo} disabled={importando}>
              {importando ? 'Leyendo…' : '⬆ Importar desde Excel'}
            </button>
            <input ref={inputArchivoRef} type="file" accept=".xlsx" onChange={seleccionarArchivo} style={{ display: 'none' }} />
            <button type="button" className="btn-secundario" onClick={onReset}>
              Restaurar plantilla
            </button>
          </div>
        )}
      </div>

      {mostrarAcciones && mensajeImport && (
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

      <div className="grid-parametros">
        <label>
          Proyecto
          <input type="text" value={parametros.proyecto} onChange={(e) => set('proyecto', e.target.value)} />
        </label>
        <label>
          Cliente
          <input type="text" value={parametros.cliente} onChange={(e) => set('cliente', e.target.value)} />
        </label>
        <label>
          N° cursos
          <input
            type="number"
            min={1}
            value={parametros.nCursos}
            onChange={(e) => set('nCursos', Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label>
          N° semanas
          <input
            type="number"
            min={1}
            value={parametros.nSemanas}
            onChange={(e) => set('nSemanas', Math.max(1, Number(e.target.value)))}
          />
        </label>
        <label>
          Modalidad
          <input type="text" value={parametros.modalidad} onChange={(e) => set('modalidad', e.target.value)} />
        </label>
      </div>
      <p className="panel__hint">
        «N° semanas» define el Factor de las filas con Frecuencia «Por semana» (Factor = N° semanas). Las demás
        frecuencias usan Factor = 1.
      </p>
      {mostrarAcciones && (
      <p className="panel__hint">
        «Importar desde Excel» reemplaza los datos actuales (parámetros, gestión y cubicación) con los de un
        archivo <code>.xlsx</code> exportado desde esta misma calculadora — útil para retomar una cubicación
        guardada o compartida por otra persona. Antes de aplicar se muestra un resumen de lo que cambia y ninguna
        fila del archivo se pierde en silencio: la que no se puede importar queda listada como omitida. Las etapas
        que estaban desactivadas al exportar no quedan en el archivo, así que al reimportar todas las etapas
        presentes vuelven a estar activas.
      </p>
      )}
    </section>
  );
}
