import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'node:path';

/**
 * La geolocalización sólo funciona en HTTPS o localhost (sección 8.8). Para
 * probar en el celular con la IP de la red local hace falta certificado:
 * `npm run dev:https` (el navegador avisará del certificado autofirmado).
 */
const useHttps = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    // Necesario para abrir la app desde el celular en la red local (Fase 1).
    host: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
