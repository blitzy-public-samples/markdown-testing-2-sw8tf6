import { defineConfig } from 'vite'; // ^4.4.5
import react from '@vitejs/plugin-react'; // ^4.0.4
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh for rapid development
      fastRefresh: true,
      // Use automatic JSX runtime
      jsxRuntime: 'automatic',
      // Babel configuration for runtime helpers
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime', {
            helpers: true
          }]
        ]
      }
    })
  ],

  resolve: {
    // Path aliases for simplified imports
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    // Supported file extensions
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },

  server: {
    // Development server configuration
    port: 3000,
    host: true,
    // Proxy configuration for API and WebSocket
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true
      }
    },
    // Hot Module Replacement settings
    hmr: {
      overlay: true
    }
  },

  build: {
    // Output directory for production build
    outDir: 'dist',
    // Generate source maps for debugging
    sourcemap: true,
    // Use Terser for minification
    minify: 'terser',
    // Target modern browsers
    target: 'es2020',
    // Split CSS into chunks
    cssCodeSplit: true,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Rollup build options
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material'],
          redux: ['@reduxjs/toolkit', 'react-redux'],
          utils: ['axios', 'socket.io-client', 'date-fns']
        }
      }
    },
    // Terser minification options
    terserOptions: {
      compress: {
        // Remove console logs and debugger statements in production
        drop_console: true,
        drop_debugger: true
      }
    }
  },

  optimizeDeps: {
    // Dependencies to pre-bundle
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      'react-redux',
      'axios',
      'socket.io-client',
      'date-fns'
    ],
    // Dependencies to exclude from pre-bundling
    exclude: ['@babel/runtime']
  },

  esbuild: {
    // Automatically inject React import
    jsxInject: "import React from 'react'",
    // Target modern JavaScript
    target: 'es2020'
  }
});