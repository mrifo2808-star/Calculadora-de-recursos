import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base debe coincidir con el nombre del repo en GitHub Pages:
// https://<usuario>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: '/welearn-calculadora-recursos/',
})
