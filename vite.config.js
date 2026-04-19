import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    // HTTPS è OBBLIGATORIO per getUserMedia (camera) su Chrome mobile
    // Usa: npx vite --host  → poi apri l'IP sul telefono
    host: true,
    port: 5173,
  },
})