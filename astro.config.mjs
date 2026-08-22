import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://www.aiamigos.org',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    assets: 'assets'
  },
  compressHTML: true,
  vite: {
    optimizeDeps: {
      exclude: ['aria-query', 'axobject-query']
    }
  }
});
