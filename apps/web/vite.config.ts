// SPDX-License-Identifier: GPL-3.0-or-later
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Tauri attend un port fixe en développement.
  server: { port: 5173, strictPort: true },
});
