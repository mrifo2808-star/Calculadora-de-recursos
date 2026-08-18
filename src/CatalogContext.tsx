import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RecursoCatalogo } from './types';
import { CATALOGO_BASE } from './data/catalogo';
import { supabase, supabaseConfigurado } from './supabaseClient';

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
  /** Sube/actualiza filas en el catalogo compartido (no borra las que falten en `filas`). */
  actualizarCatalogo: (filas: RecursoCatalogo[]) => Promise<ResultadoOperacion>;
  /** Reemplaza TODO el catalogo compartido por el set incorporado en el codigo (CATALOGO_BASE). */
  restaurarCatalogoOriginal: () => Promise<ResultadoOperacion>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<RecursoCatalogo[]>(CATALOGO_BASE);
  const [cargando, setCargando] = useState(supabaseConfigurado);
  const [error, setError] = useState<string | null>(null);
  const [fuenteRemota, setFuenteRemota] = useState(false);

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

  const actualizarCatalogo = useCallback(async (filas: RecursoCatalogo[]): Promise<ResultadoOperacion> => {
    if (!supabaseConfigurado) return { ok: false, error: 'Supabase no está configurado en este build.' };
    const { error: errorUpsert } = await supabase.from('catalogo_recursos').upsert(filas.map(recursoAFilaDB));
    if (errorUpsert) return { ok: false, error: errorUpsert.message };
    return { ok: true };
  }, []);

  const restaurarCatalogoOriginal = useCallback(async (): Promise<ResultadoOperacion> => {
    if (!supabaseConfigurado) return { ok: false, error: 'Supabase no está configurado en este build.' };
    // Respaldo en memoria del catalogo compartido tal como esta ANTES de borrar, para
    // poder recuperarlo si el insert del catalogo base falla y la tabla queda vacia.
    const backup = catalogo;
    const { error: errorDelete } = await supabase.from('catalogo_recursos').delete().neq('id', '');
    if (errorDelete) return { ok: false, error: errorDelete.message };
    const { error: errorInsert } = await supabase.from('catalogo_recursos').insert(CATALOGO_BASE.map(recursoAFilaDB));
    if (errorInsert) {
      if (backup.length === 0) return { ok: false, error: errorInsert.message };
      const { error: errorRestore } = await supabase.from('catalogo_recursos').insert(backup.map(recursoAFilaDB));
      if (errorRestore) {
        return {
          ok: false,
          error: `No se pudo insertar el catálogo base (${errorInsert.message}) ni recuperar el catálogo anterior (${errorRestore.message}). El catálogo compartido quedó vacío — contacta a alguien con acceso a Supabase.`,
        };
      }
      return { ok: false, error: `No se pudo restaurar el catálogo base (${errorInsert.message}). Se recuperó el catálogo anterior sin cambios.` };
    }
    return { ok: true };
  }, [catalogo]);

  const value = useMemo<CatalogContextValue>(
    () => ({ catalogo, cargando, error, fuenteRemota, actualizarCatalogo, restaurarCatalogoOriginal }),
    [catalogo, cargando, error, fuenteRemota, actualizarCatalogo, restaurarCatalogoOriginal],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return ctx;
}
