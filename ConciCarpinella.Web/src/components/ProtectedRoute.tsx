// Componente que protege rutas privadas
// Si el usuario no inició sesión, lo redirige al login
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { estaAutenticado } = useAuth()

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />
  }

  // Si está autenticado, renderiza el componente de la ruta actual
  return <Outlet />
}
