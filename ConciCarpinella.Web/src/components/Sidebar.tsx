// ============================================================
// BARRA LATERAL DE NAVEGACIÓN
// Muestra el menú principal del sistema con los accesos
// a cada sección. Resalta la sección activa.
// Nomencladores agrupa sus 5 submódulos bajo una entrada madre.
// ============================================================

import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Building2,
  FileCheck2, BookOpen, Users, FileText, ChevronRight, Settings,
  ChevronDown,
} from 'lucide-react'

// ── Ítems del menú principal (sin los submódulos de Nomencladores) ──
const menuItems = [
  { to: '/dashboard',                  label: 'Panel Principal',   icono: LayoutDashboard, roles: [] },
  { to: '/obras-sociales',             label: 'Obras Sociales',    icono: Building2,       roles: [] },
  { to: '/configuracion-obra-social',  label: 'Configuración OS',  icono: Settings,        roles: [] },
  { to: '/normas-operativas',          label: 'Normas Operativas', icono: FileText,        roles: [] },
  { to: '/autorizaciones',             label: 'Autorizaciones',    icono: FileCheck2,      roles: [] },
  { to: '/usuarios',                   label: 'Usuarios',          icono: Users,           roles: ['Admin'] },
]

// ── Submódulos del grupo Nomencladores ──────────────────────
const NOMENCLADORES_ITEMS = [
  { to: '/nomencladores',                     label: 'Home'                 },
  { to: '/nomencladores/nomencladores',       label: 'Nomencladores'        },
  { to: '/nomencladores/practicas',           label: 'Prácticas'            },
  { to: '/nomencladores/clasificador-practicas', label: 'Agrup. Prácticas'  },
  { to: '/nomencladores/unidad-arancel',      label: 'Unidades Arancel'     },
  { to: '/nomencladores/conceptos',           label: 'Conceptos'            },
]

export default function Sidebar() {
  const { tieneRol } = useAuth()
  const location = useLocation()

  // El grupo está activo si la ruta actual empieza con /nomencladores
  const grupoActivo = location.pathname.startsWith('/nomencladores')

  // Se expande automáticamente si el grupo está activo, o manualmente
  const [expandido, setExpandido] = useState(grupoActivo)

  return (
    <aside className="w-64 bg-azul text-white flex flex-col shadow-xl flex-shrink-0">
      {/* Logo / Título del sistema */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-salmon rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-white/60 leading-none">Sistema de Gestión</p>
            <p className="font-bold text-sm leading-tight mt-0.5">Conci Carpinella</p>
          </div>
        </div>
      </div>

      {/* Menú de navegación */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">

        {/* ── Ítems regulares ── */}
        {menuItems.map((item) => {
          if (item.roles.length > 0 && !tieneRol(item.roles)) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icono size={18} className={isActive ? 'text-salmon' : 'text-white/60 group-hover:text-white'} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="text-salmon" />}
                </>
              )}
            </NavLink>
          )
        })}

        {/* ── Grupo Nomencladores ── */}
        <div>
          {/* Entrada madre */}
          <button
            onClick={() => setExpandido(v => !v)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
              grupoActivo
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <BookOpen
              size={18}
              className={grupoActivo ? 'text-salmon' : 'text-white/60 group-hover:text-white'}
            />
            <span className="flex-1 text-left">Nomencladores</span>
            {expandido
              ? <ChevronDown size={14} className="text-white/60" />
              : <ChevronRight size={14} className={grupoActivo ? 'text-salmon' : 'text-white/60'} />
            }
          </button>

          {/* Submódulos indentados */}
          {expandido && (
            <div className="mt-0.5 ml-4 pl-3 border-l border-white/15 space-y-0.5">
              {NOMENCLADORES_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/nomencladores'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-white/15 text-white font-medium'
                        : 'text-white/65 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

      </nav>

      {/* Versión del sistema al pie */}
      <div className="px-6 py-3 border-t border-white/10">
        <p className="text-xs text-white/40">v1.0.0 — 2024</p>
      </div>
    </aside>
  )
}
