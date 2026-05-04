import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        const srcFile = resolve(__dirname, 'public/_redirects');
        const destDir = resolve(__dirname, 'dist');
        const destFile = resolve(destDir, '_redirects');
        
        if (existsSync(srcFile)) {
          if (!existsSync(destDir)) {
            mkdirSync(destDir, { recursive: true });
          }
          copyFileSync(srcFile, destFile);
          console.log('✅ Copied _redirects to dist folder');
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})