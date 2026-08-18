import { createContext, useContext, useState, type ReactNode } from 'react';
import './ConfirmModal.css';

interface OpcionesConfirm {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
}

interface Pedido extends OpcionesConfirm {
  mensaje: string;
  resolver: (valor: boolean) => void;
}

interface ConfirmContextValue {
  /** Reemplazo de window.confirm(): resuelve true/false segun lo que elija el usuario. */
  confirmar: (mensaje: string, opciones?: OpcionesConfirm) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm(): ConfirmContextValue['confirmar'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de <ConfirmProvider>');
  return ctx.confirmar;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);

  const confirmar = (mensaje: string, opciones?: OpcionesConfirm): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      setPedido({ mensaje, ...opciones, resolver: resolve });
    });

  const cerrar = (valor: boolean) => {
    pedido?.resolver(valor);
    setPedido(null);
  };

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
            <p className="confirm-modal__mensaje">{pedido.mensaje}</p>
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
