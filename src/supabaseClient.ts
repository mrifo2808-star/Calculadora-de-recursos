import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** true solo si el build tiene URL + anon key configurados (ver .env.example). */
export const supabaseConfigurado = Boolean(url && anonKey);

if (!supabaseConfigurado) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configurados. ' +
      'El login y el catalogo compartido no van a funcionar hasta configurarlos (ver .env.example).',
  );
}

// createClient exige strings no vacios; con supabaseConfigurado=false el cliente queda
// inutilizable mas no revienta el import — la UI (AccessGate/CatalogContext) revisa
// supabaseConfigurado antes de usarlo y muestra un aviso en vez de fallar en silencio.
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder');
