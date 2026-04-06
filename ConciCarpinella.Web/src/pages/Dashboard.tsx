// ============================================================
// PANEL PRINCIPAL (DASHBOARD)
// Muestra un resumen del sistema con tarjetas de estadísticas
// ============================================================

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { obrasSocialesService } from '../services/obrasSocialesService'
import { planesService } from '../services/planesService'
import { autorizacionesService } from '../services/autorizacionesService'
import { Building2, ClipboardList, FileCheck2, Clock, CheckCircle, XCircle } from 'lucide-react'

// Componente de tarjeta de estadística
function TarjetaStat({
  titulo, valor, icono: Icono, color, subtitulo
}: {
  titulo: string
  valor: string | number
  icono: React.ElementType
  color: string
  subtitulo?: string
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{titulo}</p>
          <p className="text-3xl font-bold text-slate-800 mt-1">{valor}</p>
          {subtitulo && <p className="text-xs text-slate-400 mt-1">{subtitulo}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icono size={20} className="text-white" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { usuario } = useAuth()

  // Cargamos datos en paralelo usando React Query
  const { data: obras }    = useQuery({ queryKey: ['obras-sociales'], queryFn: () => obrasSocialesService.listar() })
  const { data: planes }   = useQuery({ queryKey: ['planes'],         queryFn: () => planesService.listar() })
  const { data: autorizs } = useQuery({ queryKey: ['autorizaciones'], queryFn: () => autorizacionesService.listar() })

  // Calculamos estadísticas
  const obrasActivas    = obras?.filter(o => o.activa).length ?? 0
  const planesActivos   = planes?.filter(p => p.activo).length ?? 0
  const pendientes      = autorizs?.filter(a => a.estado === 'Pendiente').length ?? 0
  const aprobadas       = autorizs?.filter(a => a.estado === 'Aprobada').length ?? 0
  const rechazadas      = autorizs?.filter(a => a.estado === 'Rechazada').length ?? 0

  return (
    <div>
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">
          Buen día, {usuario?.nombre} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Resumen del sistema de gestión de convenios
        </p>
      </div>

      {/* Tarjetas de estadísticas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <TarjetaStat
          titulo="Obras Sociales"
          valor={obrasActivas}
          icono={Building2}
          color="bg-azul"
          subtitulo="activas en el sistema"
        />
        <TarjetaStat
          titulo="Planes Vigentes"
          valor={planesActivos}
          icono={ClipboardList}
          color="bg-azul-claro"
          subtitulo="planes habilitados"
        />
        <TarjetaStat
          titulo="Autorizaciones"
          valor={autorizs?.length ?? 0}
          icono={FileCheck2}
          color="bg-salmon"
          subtitulo="registradas en total"
        />
        <TarjetaStat
          titulo="Pendientes"
          valor={pendientes}
          icono={Clock}
          color="bg-amber-500"
          subtitulo="requieren atención"
        />
      </div>

      {/* Detalle de autorizaciones por estado */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Estado de Autorizaciones</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle size={20} className="text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{aprobadas}</p>
              <p className="text-xs text-green-600">Aprobadas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
            <Clock size={20} className="text-amber-600" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{pendientes}</p>
              <p className="text-xs text-amber-600">Pendientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <XCircle size={20} className="text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">{rechazadas}</p>
              <p className="text-xs text-red-600">Rechazadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
