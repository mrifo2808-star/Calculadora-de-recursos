/** Pie estandar del sistema de diseno WeLearn (Diseno-WeLearn/DISENO.md): mismo
 * texto y clase `.wl-footer` (tokens.css) en todas las herramientas del ecosistema.
 * `standalone` decide si el componente es el propio landmark <footer role="contentinfo">
 * (paginas sin otro footer, ej. AccessGate) o solo la linea de credito para anidar dentro
 * de un <footer> que ya existe (App: evita dos landmarks "contentinfo" en la misma pagina). */
interface Props {
  standalone?: boolean;
}

const TEXTO = 'Calculadora de Recursos WeLearn · Desarrollado por Matías Rifo V.';

export function FooterWeLearn({ standalone = true }: Props) {
  if (standalone) {
    return (
      <footer className="wl-footer" role="contentinfo">
        {TEXTO}
      </footer>
    );
  }
  return <p className="wl-footer">{TEXTO}</p>;
}
