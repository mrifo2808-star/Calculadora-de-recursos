import { useEffect, useState } from 'react';
import { etiquetaRecurso, recursoPorId, recursosPorTipo, tiposDisponibles } from '../data/catalogo';

interface Props {
  recursoId: string | null;
  onChange: (recursoId: string | null) => void;
}

export function CascadaSelector({ recursoId, onChange }: Props) {
  const recursoActual = recursoPorId(recursoId);
  // El Tipo elegido se guarda aparte del recurso: cuando un Tipo tiene varios
  // Recursos validos, recursoId queda en null hasta que el usuario elige uno,
  // pero el select de Tipo no debe "olvidar" lo que ya se eligio.
  const [tipoPendiente, setTipoPendiente] = useState(recursoActual?.tipo ?? '');

  useEffect(() => {
    if (recursoActual) setTipoPendiente(recursoActual.tipo);
  }, [recursoId, recursoActual]);

  const tipoActual = recursoActual?.tipo ?? tipoPendiente;
  const opcionesRecurso = tipoActual ? recursosPorTipo(tipoActual) : [];

  const handleTipo = (tipo: string) => {
    setTipoPendiente(tipo);
    if (!tipo) {
      onChange(null);
      return;
    }
    const opciones = recursosPorTipo(tipo);
    onChange(opciones.length === 1 ? opciones[0].id : null);
  };

  return (
    <div className="cascada">
      <select
        aria-label="Tipo"
        value={tipoActual}
        onChange={(e) => handleTipo(e.target.value)}
        className="cascada__tipo"
      >
        <option value="">Tipo…</option>
        {tiposDisponibles().map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        aria-label="Recurso"
        value={recursoId ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={!tipoActual}
        className="cascada__recurso"
      >
        <option value="">{tipoActual ? 'Recurso…' : '—'}</option>
        {opcionesRecurso.map((r) => (
          <option key={r.id} value={r.id}>
            {etiquetaRecurso(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
