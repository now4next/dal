import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dal.fyi',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
