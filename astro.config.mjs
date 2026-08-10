import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://daanvanhasselt.github.io',
  base: process.env.BASE_PATH ?? '/',
});
