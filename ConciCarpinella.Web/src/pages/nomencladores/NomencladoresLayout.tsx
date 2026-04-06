// ============================================================
// LAYOUT ANIDADO: Módulo Nomencladores
// Renderiza la barra de solapas persistente en la parte superior
// de todas las rutas del módulo, antes del título de cada página.
// Se monta dentro del Layout principal (que ya tiene p-6).
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const SOLAPAS = [
  { label: 'Home',                 ruta: '/nomencladores',                      exact: true  },
  { label: 'Nomencladores',        ruta: '/nomencladores/nomencladores',         exact: false },
  { label: 'Prácticas',            ruta: '/nomencladores/practicas',             exact: false },
  { label: 'Agrup. Prácticas',     ruta: '/nomencladores/clasificador-practicas',exact: false },
  { label: 'Unidades Arancel',     ruta: '/nomencladores/unidad-arancel',        exact: false },
  { label: 'Conceptos',            ruta: '/nomencladores/conceptos',             exact: false },
]

export default function NomencladoresLayout() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div>
      {/* ── Encabezado del dominio + solapas ─────────────────────
          Usa -mx-6 -mt-6 para cancelar el p-6 del Layout principal
          y extender la barra hasta los bordes del área de contenido.
      ──────────────────────────────────────────────────────────── */}
      <div className="-mx-6 -mt-6 px-6 pt-3 bg-white border-b border-slate-200 mb-6">
        {/* Solapas */}
        <div className="flex overflow-x-auto">
          {SOLAPAS.map(s => {
            const activa = s.exact ? pathname === s.ruta : pathname === s.ruta
            return (
              <button
                key={s.ruta}
                onClick={() => navigate(s.ruta)}
                className={`px-5 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activa
                    ? 'border-azul text-azul'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenido del submódulo activo ───────────────────── */}
      <Outlet />
    </div>
  )
}
