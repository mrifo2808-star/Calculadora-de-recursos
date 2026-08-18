import type { ParametrosCurso } from '../types';

interface Props {
  parametros: ParametrosCurso;
  onChange: (p: ParametrosCurso) => void;
  onReset: () => void;
  onExport: () => void;
  exportando: boolean;
}

export function PanelParametros({ parametros, onChange, onReset, onExport, exportando }: Props) {
  const set = <K extends keyof ParametrosCurso>(key: K, value: ParametrosCurso[K]) =>
    onChange({ ...parametros, [key]: value });

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Parámetros del proyecto</h2>
        <div className="panel__acciones">
          <button type="button" className="btn-secundario" onClick={onExport} disabled={exportando}>
            {exportando ? 'Generando…' : '⬇ Exportar a Excel'}
          </button>
          <button type="button" className="btn-secundario" onClick={onReset}>
            Restaurar plantilla
          </button>
        </div>
      </div>
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
    </section>
  );
}
