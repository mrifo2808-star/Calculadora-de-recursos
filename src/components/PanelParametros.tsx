import type { ParametrosCurso } from '../types';

interface Props {
  parametros: ParametrosCurso;
  onChange: (p: ParametrosCurso) => void;
  onReset: () => void;
}

export function PanelParametros({ parametros, onChange, onReset }: Props) {
  const set = <K extends keyof ParametrosCurso>(key: K, value: ParametrosCurso[K]) =>
    onChange({ ...parametros, [key]: value });

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Parámetros del proyecto</h2>
        <button type="button" className="btn-secundario" onClick={onReset}>
          Restaurar plantilla
        </button>
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
        <label className="checkbox checkbox--param">
          <input
            type="checkbox"
            checked={parametros.incluyeAudiovisual}
            onChange={(e) => set('incluyeAudiovisual', e.target.checked)}
          />
          Incluye audiovisual
        </label>
      </div>
      <p className="panel__hint">
        «N° semanas» define el Factor de las filas con Frecuencia «Por semana» (Factor = N° semanas). Las demás
        frecuencias usan Factor = 1.
      </p>
    </section>
  );
}
