import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import './AccessGate.css';
import { supabase, supabaseConfigurado } from './supabaseClient';

/**
 * Cuenta compartida por todo el equipo (no es secreta, es solo el identificador de la
 * cuenta de Supabase Auth) — la clave real vive en Supabase, no aqui. Se crea a mano
 * una vez desde el dashboard: Authentication -> Users -> Add user (con "Auto Confirm
 * User" activado para no depender de un correo de verificacion).
 */
const EQUIPO_EMAIL = 'equipo@calculadora.welearn.cl';

interface AccessContextValue {
  cerrarSesion: () => void;
}

const AccessContext = createContext<AccessContextValue | null>(null);

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error('useAccess debe usarse dentro de <AccessGate>');
  return ctx;
}

type EstadoSesion = 'cargando' | Session | null;

export function AccessGate({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<EstadoSesion>('cargando');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) {
      setSesion(null);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
    });
    return () => suscripcion.subscription.unsubscribe();
  }, []);

  const cerrarSesion = () => {
    supabase.auth.signOut();
    // Evita que en un equipo compartido la siguiente persona vea la clave anterior
    // con el boton "mostrar clave" del formulario de login.
    setClave('');
    setMostrarClave(false);
  };

  if (sesion === 'cargando') {
    return (
      <div className="acceso">
        <p className="acceso__cargando">Cargando…</p>
      </div>
    );
  }

  if (sesion) {
    return <AccessContext.Provider value={{ cerrarSesion }}>{children}</AccessContext.Provider>;
  }

  if (!supabaseConfigurado) {
    return (
      <div className="acceso">
        <div className="acceso__tarjeta">
          <div className="acceso__icono" aria-hidden="true">
            ⚠️
          </div>
          <h1>Falta configurar Supabase</h1>
          <p className="acceso__subtitulo">
            Esta instancia no tiene <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> configurados.
            Sin eso no hay login ni catálogo compartido posible. Ver <code>.env.example</code> y{' '}
            <code>supabase/migracion_inicial.sql</code> en el repositorio.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!clave.trim() || verificando) return;
    setVerificando(true);
    setError(false);
    const { error: errorLogin } = await supabase.auth.signInWithPassword({ email: EQUIPO_EMAIL, password: clave });
    setVerificando(false);
    if (errorLogin) {
      setError(true);
      setClave('');
    } else {
      // Limpia la clave del formulario en memoria — si la sesion despues expira o se
      // cierra, el input no debe reaparecer con la clave anterior ya tipeada.
      setClave('');
      setMostrarClave(false);
    }
    // Si fue exitoso, onAuthStateChange actualiza `sesion` solo y este componente
    // re-renderiza mostrando `children`.
  };

  return (
    <div className="acceso">
      <form className={error ? 'acceso__tarjeta acceso__tarjeta--error' : 'acceso__tarjeta'} onSubmit={handleSubmit}>
        <div className="acceso__icono" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h1>WeLearn — Calculadora de Recursos</h1>
        <p className="acceso__subtitulo">Acceso restringido. Ingresa la clave compartida por el equipo.</p>

        <label className="acceso__campo">
          <span>Clave de acceso</span>
          <div className="acceso__input-wrap">
            <input
              type={mostrarClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                if (error) setError(false);
              }}
              autoFocus
              autoComplete="current-password"
              placeholder="••••••••"
            />
            <button
              type="button"
              className="acceso__toggle"
              onClick={() => setMostrarClave((v) => !v)}
              aria-label={mostrarClave ? 'Ocultar clave' : 'Mostrar clave'}
            >
              {mostrarClave ? '🙈' : '👁'}
            </button>
          </div>
        </label>

        {error && <p className="acceso__error">Clave incorrecta. Intenta de nuevo.</p>}

        <button type="submit" className="acceso__btn" disabled={verificando || !clave.trim()}>
          {verificando ? 'Verificando…' : 'Ingresar'}
        </button>

        <p className="acceso__nota">
          El acceso se verifica en el servidor (Supabase Auth), no en este navegador. La sesión queda guardada en
          este dispositivo hasta que uses «Cerrar sesión».
        </p>
      </form>
    </div>
  );
}
