import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: false, // Keep CSS in one file to ensure all styles are included
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split node_modules into vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor'
            }
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor'
            }
            if (id.includes('react-hook-form') || id.includes('@hookform')) {
              return 'form-vendor'
            }
            if (id.includes('zustand')) {
              return 'zustand-vendor'
            }
            // Other node_modules
            return 'vendor'
          }
        },
        // Optimize chunk file names for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable compression
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: parseInt(process.env.PORT || '4173', 10),
    host: '0.0.0.0',
    strictPort: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})

