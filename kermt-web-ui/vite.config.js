/** Development keeps station addresses behind the gateway; Ketcher uses events in-browser.
 * The inference backend (health, molecule validation, generation) is set up separately —
 * point KERMT_BACKEND_URL at wherever it's running. Defaults to the historical local port. */
import {defineConfig} from 'vite';
const backend = process.env.KERMT_BACKEND_URL || 'http://127.0.0.1:8080';
export default defineConfig({
  define: {global: 'globalThis'},
  resolve: {alias: {events: 'events/'}},
  server: {proxy: {'/api': backend}},
  // Ketcher's ES module distribution also imports Raphael through CommonJS.
  build: {commonjsOptions: {transformMixedEsModules: true}, chunkSizeWarningLimit: 6000},
});
