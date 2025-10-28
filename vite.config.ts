import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { visualizer } from "rollup-plugin-visualizer";


const isAnalyze = process.env.ANALYZE === 'true';


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
          // Separate vendor chunks for better caching
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor';
          }
          // Keep Three.js separate but don't split @react-three packages
          // They need to stay with the component that uses them to avoid dependency issues
          if (id.includes('node_modules/three/') && !id.includes('@react-three')) {
            return 'three-core';
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
    chunkSizeWarningLimit: 800,
  },
})