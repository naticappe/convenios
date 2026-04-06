// ============================================================
// PUNTO DE ENTRADA DE LA APLICACIÓN REACT
// Aquí arranca toda la aplicación web
// ============================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import App from './App.tsx'
import './index.css'

// QueryClient: gestiona el caché de datos del servidor
// Evita hacer la misma petición dos veces si los datos son recientes
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Si la petición falla, no reintenta automáticamente
      retry: 1,
      // Los datos se consideran frescos por 5 minutos
      staleTime: 5 * 60 * 1000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* QueryClientProvider: comparte el cliente de datos con toda la app */}
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider: comparte la información de sesión con toda la app */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
