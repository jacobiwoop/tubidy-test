import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, /api part vers le serveur Go local (cmd/resolve -serve :8091).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8091' },
  },
});
