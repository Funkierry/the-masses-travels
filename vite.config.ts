import { defineConfig } from 'vite';
export default defineConfig({
 resolve: { preserveSymlinks: true },
 server: { host:'127.0.0.1' },
 build: { chunkSizeWarningLimit:650, rollupOptions: { input: { main:'index.html', personal:'personal.html' }, output: { manualChunks: { three:['three'] } } } }
});
