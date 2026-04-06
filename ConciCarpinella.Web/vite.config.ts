import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Configuración de Vite para el proyecto Conci Carpinella
// Documentación: https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5173,
    // Proxy: redirige las llamadas a /api al servidor backend
    // Así evitamos problemas de CORS durante el desarrollo
    proxy: {
      '/api': {
        target: 'http://localhost:5009',  // URL del backend .NET
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
