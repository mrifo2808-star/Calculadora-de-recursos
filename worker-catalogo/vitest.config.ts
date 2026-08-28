import { defineConfig } from 'vitest/config';

// Solo prueba la logica pura exportada de src/index.ts (URL, CORS, validacion de
// bytes) en Node normal — no el handler fetch() completo, que necesita el runtime de
// Workers (Cache API, etc.) y se prueba a mano con `npm run dev` (wrangler dev/local).
export default defineConfig({
  test: {
    environment: 'node',
  },
});
