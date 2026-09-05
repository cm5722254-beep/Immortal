import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),

    // ================================================================
    // 🔒 OBFUSCATION — Only active in production build
    // Makes reverse-engineering significantly harder
    // ================================================================
    ...(mode === 'production'
      ? [
          (() => {
            try {
              // Try to load obfuscator if installed
              const { default: obfuscatorPlugin } = require('vite-plugin-javascript-obfuscator');
              return obfuscatorPlugin({
                options: {
                  // Rename variables to gibberish (a, b, c...)
                  identifierNamesGenerator: 'mangled',
                  // Encode string literals
                  stringArray: true,
                  rotateStringArray: true,
                  stringArrayThreshold: 0.8,
                  // Break up code flow
                  controlFlowFlattening: false, // keep false — performance impact
                  // Self-defending: code detects tampering
                  selfDefending: true,
                  // Disable debugger
                  debugProtection: true,
                  debugProtectionInterval: 0,
                  // Remove console logs in production
                  disableConsoleOutput: true,
                  // Compact output
                  compact: true,
                  // Exclude source maps
                  sourceMap: false,
                },
              });
            } catch {
              // Obfuscator not installed — skip silently
              return null;
            }
          })(),
        ].filter(Boolean)
      : []),
  ],

  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 800,

    // No source maps in production — prevents reverse engineering
    sourcemap: mode !== 'production',

    rollupOptions: {
      output: {
        // Randomize chunk filenames — harder to map structure
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[hash].js`,
        assetFileNames: `assets/[hash][extname]`,

        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('zustand')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('hls.js')) {
              return 'vendor-player';
            }
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
          }
        },
      },
    },
  },
}));
