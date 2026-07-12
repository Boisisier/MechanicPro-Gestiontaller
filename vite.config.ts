import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolvePath('./index.html'),
        // Páginas públicas sin login (link que el taller le manda a su cliente): entradas de
        // Vite separadas para no mandar el bundle completo del dashboard autenticado a un
        // visitante anónimo. La app no usa react-router en ningún lado, así que no van dentro
        // de App.tsx.
        seguimiento: resolvePath('./seguimiento.html'),
        presupuesto: resolvePath('./presupuesto.html'),
      },
    },
  },
});
