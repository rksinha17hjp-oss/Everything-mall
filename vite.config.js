import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub Pages project URL usually ends with /repository-name/
  // Update this to your exact repository name before deployment.
  base: '/everything-mall/',
})