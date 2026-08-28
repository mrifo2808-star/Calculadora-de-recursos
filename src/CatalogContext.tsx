import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RecursoCatalogo } from './types';
import { CATALOGO_BASE } from './data/catalogo';
import { supabase, supabaseConfigurado } from './supabaseClient';
import {
  catalogoWorkerConfigurado,
  chequearTamanoRazonable,
  guardarUltimaSincronizacion,
  sincronizacionAutomaticaDebida,
  ultimaSincronizacionGuardada,
} from './catalogoSharePoint';
// obtenerCatalogoDesdeSharePoint vive en excelCatalogo.ts (necesita xlsx, ~500 KB) — se
// trae con import() dinamico recien al sincronizar, nunca estatico (ver mas abajo),
// para no meterlo en el bundle principal aunque este archivo se cargue siempre.

interface FilaCatalogoDB {
  id: string;
  estado: string;
  tipo: string;
  nombre_visible: string;
  extension: string;
  unidad: string;
  di: number | null;
  dg: number | null;
  sop: number | null;
  fuente: string;
  observaciones: string;
}

const filaDBaRecurso = (f: FilaCatalogoDB): RecursoCatalogo => ({
  id: f.id,
  estado: f.estado as RecursoCatalogo['estado'],
  tipo: f.tipo,
  nombreVisible: f.nombre_visible,
  extension: f.extension,
  unidad: f.unidad,
  di: f.di,
  dg: f.dg,
  sop: f.sop,
  fuente: f.fuente,
  observaciones: f.observaciones,
});

const recursoAFilaDB = (r: RecursoCatalogo): FilaCatalogoDB => ({
  id: r.id,
  estado: r.estado,
  tipo: r.tipo,
  nombre_visible: r.nombreVisible,
  extension: r.extension,
  unidad: r.unidad,
  di: r.di,
  dg: r.dg,
  sop: r.sop,
  fuente: r.fuente,
  observaciones: r.observaciones,
});

interface ResultadoOperacion {
  ok: boolean;
  error?: string;
}

interface CatalogContextValue {
  catalogo: RecursoCatalogo[];
  cargando: boolean;
  error: string | null;
  /** true si `catalogo` viene de Supabase (compartido y en vivo); false si es el respaldo local. */
  fuenteRemota: boolean;
  /** Reemplaza TODO el catalogo compartido por el set incorporado en el codigo
   * (CATALOGO_BASE) — salida de emergencia si el catalogo compartido queda en mal
   * estado; no es la via normal de actualizacion (esa es `sincronizarDesdeSharePoint`). */
  restaurarCatalogoOriginal: () => Promise<ResultadoOperacion>;
  /** true si esta build tiene el proxy de SharePoint configurado (VITE_CATALOGO_WORKER_URL). */
  catalogoWorkerConfigurado: boolean;
  sincronizando: boolean;
  /** Ultima vez que una sincronizacion desde SharePoint (automatica o manual) aplico un
   * catalogo con exito, en ESTE navegador (ver catalogoSharePoint.ts). null si nunca. */
  ultimaSincronizacion: Date | null;
  errorSincronizacion: string | null;
  /** Trae el catalogo desde SharePoint (via el Worker-proxy) y REEMPLAZA el catalogo
   * compartido completo (a diferencia de `actualizarCatalogo`, que solo agrega/actualiza:
   * ver catalogoSharePoint.ts para el porque). `forzar` salta el cache de ~12h del Worker. */
  sincronizarDesdeSharePoint: (forzar: boolean) => Promise<ResultadoOperacion>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<RecursoCatalogo[]>(CATALOGO_BASE);
  const [cargando, setCargando] = useState(supabaseConfigurado);
  const [error, setError] = useState<string | null>(null);
  const [fuenteRemota, setFuenteRemota] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<Date | null>(ultimaSincronizacionGuardada);
  const [errorSincronizacion, setErrorSincronizacion] = useState<string | null>(null);
  // Ref (no state) del catalogo actual, solo para que el chequeo de tamaño de la
  // sincronizacion automatica compare contra el valor mas reciente sin tener que listar
  // `catalogo` como dependencia de ese efecto (evitaria reintentos en cada cambio).
  const catalogoRef = useRef(catalogo);
  catalogoRef.current = catalogo;

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let activo = true;

    const cargar = async () => {
      const { data, error: errorFetch } = await supabase.from('catalogo_recursos').select('*').order('tipo');
      if (!activo) return;
      if (errorFetch) {
        setError('No se pudo cargar el catálogo compartido (Supabase). Mostrando la versión de referencia incorporada en el código.');
        setFuenteRemota(false);
        setCargando(false);
        return;
      }
      setCatalogo((data ?? []).map(filaDBaRecurso));
      setFuenteRemota(true);
      setError(null);
      setCargando(false);
    };

    cargar();

    // Realtime: si otra persona del equipo edita el catalogo, se refleja acá solo,
    // sin recargar la pagina.
    const canal = supabase
      .channel('catalogo_recursos_cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogo_recursos' }, cargar)
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  // Compartido por "Restaurar catálogo original" (usa CATALOGO_BASE) y por la
  // sincronizacion desde SharePoint (usa lo que venga del archivo) — mismo patron de
  // borrar-e-insertar con respaldo/rollback si el insert falla, para no dejar la tabla
  // compartida vacia.
  const reemplazarCatalogoCompleto = useCallback(
    async (nuevo: RecursoCatalogo[]): Promise<ResultadoOperacion> => {
      if (!supabaseConfigurado) return { ok: false, error: 'Supabase no está configurado en este build.' };
      const backup = catalogo;
      const { error: errorDelete } = await supabase.from('catalogo_recursos').delete().neq('id', '');
      if (errorDelete) return { ok: false, error: errorDelete.message };
      const { error: errorInsert } = await supabase.from('catalogo_recursos').insert(nuevo.map(recursoAFilaDB));
      if (errorInsert) {
        if (backup.length === 0) return { ok: false, error: errorInsert.message };
        const { error: errorRestore } = await supabase.from('catalogo_recursos').insert(backup.map(recursoAFilaDB));
        if (errorRestore) {
          return {
            ok: false,
            error: `No se pudo insertar el catálogo nuevo (${errorInsert.message}) ni recuperar el catálogo anterior (${errorRestore.message}). El catálogo compartido quedó vacío — contacta a alguien con acceso a Supabase.`,
          };
        }
        return { ok: false, error: `No se pudo aplicar el catálogo nuevo (${errorInsert.message}). Se recuperó el catálogo anterior sin cambios.` };
      }
      return { ok: true };
    },
    [catalogo],
  );

  const restaurarCatalogoOriginal = useCallback(
    (): Promise<ResultadoOperacion> => reemplazarCatalogoCompleto(CATALOGO_BASE),
    [reemplazarCatalogoCompleto],
  );

  const sincronizarDesdeSharePoint = useCallback(
    async (forzar: boolean): Promise<ResultadoOperacion> => {
      if (!catalogoWorkerConfigurado) {
        return { ok: false, error: 'VITE_CATALOGO_WORKER_URL no está configurado en este build.' };
      }
      setSincronizando(true);
      setErrorSincronizacion(null);
      try {
        // xlsx (~500 KB) recien se carga aca, al sincronizar de verdad — nunca en el
        // arranque de la app (ver el comentario junto al import de arriba).
        const { obtenerCatalogoDesdeSharePoint } = await import('./excelCatalogo');
        const resultado = await obtenerCatalogoDesdeSharePoint(forzar);
        const chequeo = chequearTamanoRazonable(catalogoRef.current.length, resultado.filasValidas);
        if (!chequeo.ok) {
          setErrorSincronizacion(chequeo.motivo ?? 'El archivo de SharePoint no pasó el chequeo de seguridad.');
          return { ok: false, error: chequeo.motivo };
        }
        const subida = await reemplazarCatalogoCompleto(resultado.catalogo);
        if (!subida.ok) {
          setErrorSincronizacion(subida.error ?? 'No se pudo sincronizar con el catálogo compartido.');
          return subida;
        }
        const ahora = new Date();
        guardarUltimaSincronizacion(ahora);
        setUltimaSincronizacion(ahora);
        return { ok: true };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : 'No se pudo sincronizar desde SharePoint.';
        setErrorSincronizacion(mensaje);
        return { ok: false, error: mensaje };
      } finally {
        setSincronizando(false);
      }
    },
    [reemplazarCatalogoCompleto],
  );

  // Sincronizacion automatica y silenciosa al abrir la app, si ya pasaron 12h desde la
  // ultima (o nunca hubo una) — SIN bloquear ni afectar el resto de la app si falla (ver
  // catalogoSharePoint.ts). Espera a que el catalogo de Supabase ya haya cargado (no
  // tiene sentido comparar tamaños contra el placeholder CATALOGO_BASE inicial).
  const autoSincronizacionIntentada = useRef(false);
  useEffect(() => {
    if (cargando || autoSincronizacionIntentada.current || !catalogoWorkerConfigurado || !supabaseConfigurado) return;
    if (!sincronizacionAutomaticaDebida(new Date(), ultimaSincronizacionGuardada())) return;
    autoSincronizacionIntentada.current = true;
    sincronizarDesdeSharePoint(false);
  }, [cargando, sincronizarDesdeSharePoint]);

  const value = useMemo<CatalogContextValue>(
    () => ({
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
    }),
    [
      catalogo,
      cargando,
      error,
      fuenteRemota,
      restaurarCatalogoOriginal,
      sincronizando,
      ultimaSincronizacion,
      errorSincronizacion,
      sincronizarDesdeSharePoint,
    ],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return ctx;
}
