// ============================================================
// ENRUTADOR PRINCIPAL
// Define todas las rutas (páginas) de la aplicación y a qué
// componente corresponde cada URL.
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ObrasSociales from './pages/ObrasSociales'
import Planes from './pages/Planes'
import Autorizaciones from './pages/Autorizaciones'
import Usuarios from './pages/Usuarios'
import ConfiguracionObraSocial from './pages/ConfiguracionObraSocial'
import Valores from './pages/Valores'
import NormasOperativas from './pages/NormasOperativas'

// ── Módulo Nomencladores ──────────────────────────────────────
import NomencladoresLayout      from './pages/nomencladores/NomencladoresLayout'
import NomencladoresHome        from './pages/nomencladores/NomencladoresHome'
import NomencladorMaestroPage   from './pages/nomencladores/NomencladorMaestro'
import Practicas                from './pages/nomencladores/Practicas'
import ConceptoMaestroPage      from './pages/nomencladores/ConceptoMaestro'
import UnidadArancelPage        from './pages/nomencladores/UnidadArancel'
import ClasificadorPracticasPage from './pages/nomencladores/ClasificadorPracticas'

function App() {
  const { cargando } = useAuth()

  // Mientras carga la sesión desde localStorage, mostramos un spinner
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-azul border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública: login */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas: requieren login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/"                element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"       element={<Dashboard />} />
            <Route path="/obras-sociales"  element={<ObrasSociales />} />
            <Route path="/planes"          element={<Planes />} />
            <Route path="/autorizaciones"  element={<Autorizaciones />} />
            <Route path="/usuarios"                   element={<Usuarios />} />
            <Route path="/configuracion-obra-social"  element={<ConfiguracionObraSocial />} />
            <Route path="/valores"                    element={<Valores />} />
            <Route path="/normas-operativas"          element={<NormasOperativas />} />

            {/* ── Módulo Nomencladores (layout anidado con solapas persistentes) ── */}
            <Route element={<NomencladoresLayout />}>
              <Route path="/nomencladores"                         element={<NomencladoresHome />} />
              <Route path="/nomencladores/nomencladores"           element={<NomencladorMaestroPage />} />
              <Route path="/nomencladores/practicas"               element={<Practicas />} />
              <Route path="/nomencladores/conceptos"               element={<ConceptoMaestroPage />} />
              <Route path="/nomencladores/unidad-arancel"          element={<UnidadArancelPage />} />
              <Route path="/nomencladores/clasificador-practicas"  element={<ClasificadorPracticasPage />} />
            </Route>

            {/* ── Redirects de compatibilidad (rutas antiguas) ── */}
            <Route path="/nomenclador"            element={<Navigate to="/nomencladores/nomencladores" replace />} />
            <Route path="/practicas"              element={<Navigate to="/nomencladores/practicas" replace />} />
            <Route path="/concepto"               element={<Navigate to="/nomencladores/conceptos" replace />} />
            <Route path="/unidad-arancel"         element={<Navigate to="/nomencladores/unidad-arancel" replace />} />
            <Route path="/clasificador-practicas" element={<Navigate to="/nomencladores/clasificador-practicas" replace />} />
          </Route>
        </Route>

        {/* Cualquier ruta no definida redirige al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
