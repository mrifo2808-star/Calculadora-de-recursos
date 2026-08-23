import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import './ConfirmModal.css';

interface OpcionesConfirm {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

interface Pedido extends OpcionesConfirm {
  mensaje: ReactNode;
  resolver: (valor: boolean) => void;
}

interface ConfirmContextValue {
  /** Reemplazo de window.confirm(): resuelve true/false segun lo que elija el usuario.
   * `mensaje` acepta ReactNode (no solo string) para poder mostrar un resumen con
   * estructura — listas, negritas, etc. — como el preview de importar Excel. */
  confirmar: (mensaje: ReactNode, opciones?: OpcionesConfirm) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue['confirmar'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx.confirmar;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const confirmar = (mensaje: ReactNode, opciones?: OpcionesConfirm): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      setPedido({ mensaje, ...opciones, resolver: resolve });
    });

  const cerrar = (valor: boolean) => {
    pedido?.resolver(valor);
    setPedido(null);
  };

  // Cerrar con Escape es el comportamiento esperado de cualquier dialogo modal
  // (equivalente a Cancelar); sin esto el usuario de teclado queda atrapado sin
  // forma rapida de descartar el modal.
  useEffect(() => {
    if (!pedido) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}
      {pedido && (
        <div className="confirm-modal__overlay" role="presentation" onClick={() => cerrar(false)}>
          <div
            className="confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-modal__titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-modal__titulo">{pedido.titulo ?? 'Confirmar acción'}</h2>
            {/* div, no p: el mensaje puede traer listas/parrafos (preview de importar
                Excel) y un <ul>/<p> anidado dentro de <p> es HTML invalido. */}
            <div className="confirm-modal__mensaje">{pedido.mensaje}</div>
            <div className="confirm-modal__acciones">
              <button type="button" className="confirm-modal__btn-cancelar" onClick={() => cerrar(false)} autoFocus>
                {pedido.textoCancelar ?? 'Cancelar'}
              </button>
              <button type="button" className="confirm-modal__btn-confirmar" onClick={() => cerrar(true)}>
                {pedido.textoConfirmar ?? 'Continuar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
