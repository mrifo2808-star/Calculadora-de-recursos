import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RecursoCatalogo } from './types';
import { CATALOGO_BASE } from './data/catalogo';

const STORAGE_KEY = 'welearn-catalogo-custom-v1';

interface CatalogContextValue {
  catalogo: RecursoCatalogo[];
  esPersonalizado: boolean;
  reemplazarCatalogo: (nuevo: RecursoCatalogo[]) => void;
  restaurarCatalogoOriginal: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function cargarInicial(): RecursoCatalogo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RecursoCatalogo[];
  } catch {
    // localStorage no disponible o dato corrupto: seguimos con el catalogo base
  }
  return CATALOGO_BASE;
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalogo, setCatalogo] = useState<RecursoCatalogo[]>(cargarInicial);

  useEffect(() => {
    if (catalogo === CATALOGO_BASE) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogo));
    }
  }, [catalogo]);

  const value = useMemo<CatalogContextValue>(
    () => ({
      catalogo,
      esPersonalizado: catalogo !== CATALOGO_BASE,
      reemplazarCatalogo: setCatalogo,
      restaurarCatalogoOriginal: () => setCatalogo(CATALOGO_BASE),
    }),
    [catalogo],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return ctx;
}
