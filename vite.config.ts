/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// base debe coincidir con el nombre del repo en GitHub Pages:
// https://<usuario>.github.io/<repo>/
export default defineConfig({
  plugins: [react()],
  base: '/Calculadora-de-recursos/',
  test: {
    // Solo logica pura (parseo/validacion) por ahora, sin DOM: environment 'node' basta
    // y corre mas rapido que jsdom.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
