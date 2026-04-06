// ============================================================
// NORMAS OPERATIVAS — Página principal
// Búsqueda de obra social (mismo patrón que ConfigOS)
// + NormaOperativaAdmin embebido debajo
// ============================================================

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText, Search, Building2, Hash, X,
  ChevronRight,
} from 'lucide-react'
import { obrasSocialesService } from '../services/obrasSocialesService'
import { NormaOperativaAdmin }  from '../components/NormaOperativaAdmin'
import { useAuth }              from '../context/AuthContext'
import type { ObraSocialList, EstadoObraSocial } from '../types'

// ── Colores de estado ─────────────────────────────────────────
const ESTADO_BANNER: Record<EstadoObraSocial, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  Activa:     { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  Suspendida: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  Baja:       { bg: 'bg-red-50',   border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-600',      dot: 'bg-red-500' },
}

export default function NormasOperativas() {
  const { usuario } = useAuth()

  const [inputBuscar, setInputBuscar] = useState('')
  const [buscarQuery, setBuscarQuery] = useState('')
  const [obraSelec,   setObraSelec]   = useState<ObraSocialList | null>(null)

  const { data: resultados, isFetching } = useQuery({
    queryKey: ['normas-os-buscar', buscarQuery],
    queryFn:  () => obrasSocialesService.listar({ buscar: buscarQuery }),
    enabled:  !!buscarQuery,
  })

  const ejecutarBusqueda = () => {
    if (inputBuscar.trim()) {
      setBuscarQuery(inputBuscar.trim())
      setObraSelec(null)
    }
  }

  const limpiar = () => {
    setInputBuscar(''); setBuscarQuery(''); setObraSelec(null)
  }

  const banner = obraSelec ? ESTADO_BANNER[obraSelec.estado] : null

  return (
    <div className="p-6 space-y-6">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center">
          <FileText size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Normas Operativas</h1>
          <p className="text-sm text-slate-500">Buscá una obra social para ver o editar sus normas operativas</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-400"
              placeholder="Buscar por código, sigla o nombre… (Enter para buscar)"
              value={inputBuscar}
              onChange={e => setInputBuscar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ejecutarBusqueda()}
            />
          </div>
          <button
            onClick={ejecutarBusqueda}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Buscar
          </button>
          {(buscarQuery || obraSelec) && (
            <button onClick={limpiar} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {isFetching && (
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
            Buscando…
          </div>
        )}

        {!isFetching && resultados && !obraSelec && (
          resultados.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No se encontraron resultados para "{buscarQuery}"</p>
          ) : (
            <div className="mt-3 space-y-1">
              {resultados.map(os => (
                <button
                  key={os.id}
                  onClick={() => setObraSelec(os)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{os.nombre}</p>
                    <p className="text-xs text-slate-400">{os.sigla && `${os.sigla} · `}Cód. {os.codigo}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BANNER[os.estado].badge}`}>
                    {os.estado}
                  </span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Banner OS seleccionada */}
      {obraSelec && banner && (
        <div className={`rounded-2xl border-2 p-5 ${banner.bg} ${banner.border}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${banner.badge}`}>
                <Building2 size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${banner.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${banner.dot}`} />
                    {obraSelec.estado}
                  </span>
                </div>
                <h2 className={`text-2xl font-bold ${banner.text}`}>{obraSelec.nombre}</h2>
                <div className={`flex items-center gap-4 mt-1 text-sm ${banner.text} opacity-80`}>
                  {obraSelec.sigla && <span className="font-medium">{obraSelec.sigla}</span>}
                  <span className="flex items-center gap-1">
                    <Hash size={12} />
                    Cód. {obraSelec.codigo}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={limpiar} className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity ${banner.text}`}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Dashboard de norma operativa */}
      {obraSelec && usuario && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <NormaOperativaAdmin
            obraSocialId={obraSelec.id}
            codigoOs={obraSelec.codigo}
            usuarioNombre={`${usuario.nombre} ${usuario.apellido}`}
            usuarioRol={usuario.rol}
          />
        </div>
      )}

      {/* Placeholder cuando no hay OS seleccionada */}
      {!obraSelec && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <FileText size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Buscá y seleccioná una obra social</p>
          <p className="text-slate-400 text-sm mt-1">Vas a poder ver y editar las normas operativas correspondientes</p>
        </div>
      )}
    </div>
  )
}
