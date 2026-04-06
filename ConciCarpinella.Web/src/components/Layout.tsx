// ============================================================
// LAYOUT PRINCIPAL
// Define la estructura visual de todas las páginas internas:
// barra lateral izquierda (Sidebar) + contenido principal
// ============================================================

import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Barra lateral izquierda con el menú de navegación */}
      <Sidebar />

      {/* Área principal: barra superior + contenido de la página */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar />

        {/* Contenido de la página actual (cambia según la ruta) */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
