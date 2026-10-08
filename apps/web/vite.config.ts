// SPDX-License-Identifier: GPL-3.0-or-later
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // SQLite WASM charge son fichier .wasm par URL relative : Vite ne doit pas le pré-empaqueter.
  optimizeDeps: { exclude: ['@sqlite.org/sqlite-wasm'] },
  worker: { format: 'es' },
  // Tauri attend un port fixe en développement.
  server: { port: 5173, strictPort: true },
});
