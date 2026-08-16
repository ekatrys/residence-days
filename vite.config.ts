import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this from a /<repo-name>/ subpath — adjust when the repo is created.
  base: './',
});
