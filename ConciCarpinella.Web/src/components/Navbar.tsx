// ============================================================
// BARRA SUPERIOR
// Muestra el nombre del usuario logueado y el botón de logout
// ============================================================

import { useAuth } from '../context/AuthContext'
import { LogOut, User } from 'lucide-react'

// Etiqueta legible para cada rol del sistema
const etiquetaRol: Record<string, string> = {
  Admin:      'Administrador',
  DataEntry:  'Carga de Datos',
  Analista:   'Analista',
  Secretario: 'Secretario/a',
}

export default function Navbar() {
  const { usuario, logout } = useAuth()

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm flex-shrink-0">
      {/* Título de la sección (dinámico según la ruta - podría mejorarse) */}
      <div>
        <h1 className="text-sm font-semibold text-slate-800">
          Convenios Médicos
        </h1>
        <p className="text-xs text-slate-400">Sistema de gestión integral</p>
      </div>

      {/* Datos del usuario y botón de salir */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          {/* Avatar con la inicial del usuario */}
          <div className="w-8 h-8 rounded-full bg-azul flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-800 leading-none">
              {usuario?.nombre} {usuario?.apellido}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {etiquetaRol[usuario?.rol ?? ''] ?? usuario?.rol}
            </p>
          </div>
        </div>

        {/* Separador */}
        <div className="w-px h-6 bg-slate-200" />

        {/* Botón para cerrar sesión */}
        <button
          onClick={logout}
          title="Cerrar sesión"
          className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 transition-colors text-sm"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
