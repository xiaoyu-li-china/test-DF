import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import traeSoloBadge from 'vite-plugin-trae-solo-badge';

export default defineConfig({
  plugins: [react(), traeSoloBadge()],
  server: {
    port: 5173,
  },
});
