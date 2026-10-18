import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

const PACKAGE_CHUNKS: Record<string, string> = {
  react: 'vendor-react',
  'react-dom': 'vendor-react',
  'react-router': 'vendor-react',
  'react-router-dom': 'vendor-react',
  zustand: 'vendor-state',
  '@microsoft/signalr': 'vendor-signalr',
  'framer-motion': 'vendor-animation',
  'canvas-confetti': 'vendor-animation',
  'lucide-react': 'vendor-ui',
  'qrcode.react': 'vendor-ui',
  'react-hook-form': 'vendor-ui',
  axios: 'vendor-http'
}

const getPackageName = (id: string): string | null => {
  const normalized = id.replace(/\\/g, '/')
  const match = normalized.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/)
  return match ? match[1] : null
}

export default defineConfig({
  plugins: [
    react(),

    // Gzip and Brotli compression
    compression({
      include: [/\.(js|css|html|svg|json)$/],
      threshold: 10240
    }),

    // Bundle analyzer
    visualizer({
      open: false,
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ],

  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      }
    },
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (!id.includes('node_modules')) return undefined
          const packageName = getPackageName(id)
          if (!packageName) return undefined
          return PACKAGE_CHUNKS[packageName] ?? 'vendor'
        },

        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      '@microsoft/signalr',
      'framer-motion',
      'axios'
    ]
  }
})
