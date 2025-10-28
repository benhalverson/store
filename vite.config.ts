import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, } from 'vite';
// import * as visualizer from "rollup-plugin-visualizer";
import { visualizer } from "rollup-plugin-visualizer";


const isAnalyze = process.env.ANALYZE === 'true'


export default defineConfig({
  plugins: [viteReact(), tailwindcss(),
    (isAnalyze) &&
      visualizer({
        filename: 'stats.html',
        template: 'treemap', // 'sunburst' | 'network' | 'treemap'
        brotliSize: true,
        gzipSize: true,
        open: true,
      }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Only bundle Three.js when PreviewComponent is loaded
          if (id.includes('node_modules/three/')) {
            return 'three-core';
          }
          if (id.includes('@react-three/')) {
            return 'react-three';
          }
          // Separate vendor chunks for better caching
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          if (id.includes('@headlessui') || id.includes('@heroicons') || id.includes('react-hot-toast')) {
            return 'ui-vendor';
          }
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('node_modules/zod')) {
            return 'form-vendor';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800 
  },
})  