import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const resolvePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// /estado/<token> es una ruta "bonita" (sin query string) que no existe como archivo. En prod
// (Render, ver render.yaml) un rewrite scoped a /estado/* resuelve esto a nivel del hosting
// estático; en dev necesita el mismo rewrite pero a nivel del server de Vite, si no pide
// /estado/<token> como si fuera un archivo y devuelve 404. Scoped a /estado/ nada más, a
// propósito: un rewrite general a index.html rompió el resto del sitio la vez que se probó
// (ver commit de Render en render.yaml).
const estadoRoutePlugin: Plugin = {
  name: 'estado-route-rewrite',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && req.url.startsWith('/estado/')) {
        req.url = '/estado.html';
      } else if (req.url === '/recuperar' || req.url?.startsWith('/recuperar?')) {
        req.url = '/recuperar.html';
      }
      next();
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), estadoRoutePlugin],
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
        estado: resolvePath('./estado.html'),
        recuperar: resolvePath('./recuperar.html'),
      },
    },
  },
});
