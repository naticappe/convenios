// ============================================================
// CONFIGURACIÓN OBRA SOCIAL — DASHBOARD RESUMEN
// ============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { obrasSocialesService }       from '../services/obrasSocialesService'
import { planesService }              from '../services/planesService'
import { valoresService }             from '../services/valoresService'
import { normasOperativasService }    from '../services/normasOperativasService'
import type { ObraSocialList, EstadoObraSocial } from '../types'
import {
  ClipboardList, TrendingUp, Shield, BookOpen,
  FileCheck2, ArrowLeftRight, Package, FileText,
  ChevronRight, CheckCircle2, XCircle, AlertCircle,
  Settings, Search, Building2, Hash, X
} from 'lucide-react'

// ── Colores según estado OS ───────────────────────────────────
const ESTADO_BANNER: Record<EstadoObraSocial, { bg: string; border: string; text: string; badge: string; dot: string }> = {
  Activa:     { bg: 'bg-green-50',  border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  Suspendida: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  Baja:       { bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-800',   badge: 'bg-red-100 text-red-600',     dot: 'bg-red-500' },
}

// ── Cards del dashboard ───────────────────────────────────────
interface CardDef { id: string; titulo: string; icono: React.ElementType; color: string; ruta: string }

const CARDS: CardDef[] = [
  { id: 'planes',        titulo: 'Planes',            icono: ClipboardList,  color: 'bg-blue-100 text-blue-600',    ruta: '/planes' },
  { id: 'valores',       titulo: 'Valores',           icono: TrendingUp,     color: 'bg-emerald-100 text-emerald-600', ruta: '/valores' },
  { id: 'coseguros',     titulo: 'Coseguros',         icono: Shield,         color: 'bg-violet-100 text-violet-600',  ruta: '/coseguros' },
  { id: 'coberturas',    titulo: 'Coberturas',        icono: BookOpen,       color: 'bg-sky-100 text-sky-600',       ruta: '/coberturas' },
  { id: 'autorizaciones',titulo: 'Autorizaciones',   icono: FileCheck2,     color: 'bg-orange-100 text-orange-600', ruta: '/autorizaciones' },
  { id: 'traductor',     titulo: 'Traductor',         icono: ArrowLeftRight, color: 'bg-teal-100 text-teal-600',    ruta: '/traductor' },
  { id: 'materiales',    titulo: 'Materiales',        icono: Package,        color: 'bg-amber-100 text-amber-600',  ruta: '/materiales' },
  { id: 'normas',        titulo: 'Normas Operativas', icono: FileText,       color: 'bg-rose-100 text-rose-600',    ruta: '/normas-operativas' },
]

// ── Resúmenes hardcodeados por card ───────────────────────────
const RESUMEN_CARD: Record<string, React.ReactNode> = {
  planes: (
    <div className="space-y-1 mt-2 text-sm text-slate-600">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">3 activos</p>
      {['PAMI Básico','OSDE 210','Galeno Salud'].map(n => (
        <div key={n} className="flex items-center gap-1.5">
          <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
          <span>{n}</span>
        </div>
      ))}
    </div>
  ),
  valores: (
    <div className="space-y-1 mt-2 text-sm">
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Último incremento</span><span className="font-semibold text-emerald-600">+12,5 %</span></div>
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Fecha</span><span className="text-slate-700">01/03/2025</span></div>
    </div>
  ),
  coseguros: (
    <div className="space-y-1 mt-2 text-sm">
      {[['PAMI Básico', true],['OSDE 210', true],['Galeno Salud', false]].map(([n, t]) => (
        <div key={String(n)} className="flex items-center justify-between">
          <span className="text-slate-600">{String(n)}</span>
          {t ? <CheckCircle2 size={13} className="text-green-500" /> : <XCircle size={13} className="text-red-400" />}
        </div>
      ))}
    </div>
  ),
  coberturas: (
    <div className="space-y-1 mt-2 text-sm">
      {[['PAMI Básico',145],['OSDE 210',230],['Galeno Salud',98]].map(([n,c]) => (
        <div key={String(n)} className="flex justify-between">
          <span className="text-slate-600">{String(n)}</span><span className="font-semibold text-sky-600">{String(c)}</span>
        </div>
      ))}
    </div>
  ),
  autorizaciones: (
    <div className="space-y-1 mt-2 text-sm">
      {[['PAMI Básico',48],['OSDE 210',120],['Galeno Salud',32]].map(([n,c]) => (
        <div key={String(n)} className="flex justify-between">
          <span className="text-slate-600">{String(n)}</span><span className="font-semibold text-orange-600">{String(c)}</span>
        </div>
      ))}
    </div>
  ),
  traductor: (
    <div className="space-y-1 mt-2 text-sm">
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Códigos</span><span className="text-xl font-bold text-teal-600">312</span></div>
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Última actualiz.</span><span className="text-slate-700">10/01/2025</span></div>
    </div>
  ),
  materiales: (
    <div className="space-y-1 mt-2 text-sm">
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Total</span><span className="text-xl font-bold text-amber-600">87</span></div>
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Última actualiz.</span><span className="text-slate-700">20/02/2025</span></div>
    </div>
  ),
  normas: (
    <div className="space-y-1 mt-2 text-sm">
      <div className="flex items-center gap-1.5"><AlertCircle size={13} className="text-amber-500" /><span className="text-xs text-slate-500">Sin revisión reciente</span></div>
      <div className="flex justify-between"><span className="text-slate-500 text-xs">Última actualiz.</span><span className="text-slate-700">05/03/2025</span></div>
    </div>
  ),
}

// ── Componente principal ──────────────────────────────────────
export default function ConfiguracionObraSocial() {
  const navigate = useNavigate()

  const [inputBuscar, setInputBuscar]   = useState('')
  const [buscarQuery, setBuscarQuery]   = useState('')
  const [obraSelec,   setObraSelec]     = useState<ObraSocialList | null>(null)

  // Solo ejecuta la query cuando el usuario confirma con Enter/botón
  const { data: resultados, isFetching } = useQuery({
    queryKey: ['os-config-buscar', buscarQuery],
    queryFn:  () => obrasSocialesService.listar({ buscar: buscarQuery }),
    enabled:  !!buscarQuery,
  })

  // Datos reales para cards de planes y valores de la OS seleccionada
  const { data: planesOS } = useQuery({
    queryKey: ['cards-planes', obraSelec?.id],
    queryFn:  () => planesService.listar({ obraSocialId: obraSelec!.id }),
    enabled:  !!obraSelec?.id,
  })
  const { data: importsOS } = useQuery({
    queryKey: ['cards-imports', obraSelec?.id],
    queryFn:  () => valoresService.listarImportaciones(obraSelec!.id),
    enabled:  !!obraSelec?.id,
  })
  const { data: normaOS } = useQuery({
    queryKey: ['cards-norma', obraSelec?.id],
    queryFn:  () => normasOperativasService.obtenerPorObraSocial(obraSelec!.id),
    enabled:  !!obraSelec?.id,
  })

  // Renderiza el resumen de cada card: real cuando hay OS seleccionada, placeholder si no
  const renderResumenCard = (id: string) => {
    if (id === 'planes') {
      if (obraSelec && planesOS) {
        const activos = planesOS.filter(p => p.estado === 'Activo')
        return (
          <div className="space-y-1 mt-2 text-sm text-slate-600">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {activos.length} activo{activos.length !== 1 ? 's' : ''}{planesOS.length !== activos.length ? ` · ${planesOS.length - activos.length} de baja` : ''}
            </p>
            {[...activos, ...planesOS.filter(p => p.estado !== 'Activo')].slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className={p.estado === 'Activo' ? 'text-green-500 flex-shrink-0' : 'text-slate-300 flex-shrink-0'} />
                <span className={`truncate ${p.estado !== 'Activo' ? 'line-through text-slate-400' : ''}`}>{p.nombre}</span>
              </div>
            ))}
            {planesOS.length > 4 && (
              <p className="text-xs text-slate-400">+{planesOS.length - 4} más</p>
            )}
          </div>
        )
      }
      return RESUMEN_CARD[id]
    }

    if (id === 'valores') {
      if (obraSelec && importsOS) {
        const aplicadas = importsOS.filter(i => i.aplicada).sort(
          (a, b) => new Date(b.vigenciaDesde).getTime() - new Date(a.vigenciaDesde).getTime()
        )
        const ultima = aplicadas[0]
        const penultima = aplicadas[1]
        if (!ultima) {
          return (
            <div className="mt-2 text-sm">
              <p className="text-xs text-slate-400">Sin importaciones aplicadas</p>
            </div>
          )
        }
        // Calcular variación si hay dos importaciones
        return (
          <div className="space-y-1 mt-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Última vigencia</span>
              <span className="font-semibold text-emerald-600">{ultima.vigenciaDesde}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 text-xs">Códigos</span>
              <span className="text-slate-700 font-medium">{ultima.cantidadItems}</span>
            </div>
            {penultima && (
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Importaciones</span>
                <span className="text-slate-700">{aplicadas.length} aplicadas</span>
              </div>
            )}
          </div>
        )
      }
      return RESUMEN_CARD[id]
    }

    if (id === 'normas') {
      if (obraSelec && normaOS !== undefined) {
        if (!normaOS) {
          return (
            <div className="mt-2 text-sm">
              <p className="text-xs text-slate-400 italic">Sin norma cargada</p>
            </div>
          )
        }
        return (
          <div className="space-y-1 mt-2 text-sm">
            {normaOS.tipoOrden && (
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Tipo orden</span>
                <span className="text-slate-700 truncate max-w-[100px]">{normaOS.tipoOrden.descripcion}</span>
              </div>
            )}
            {normaOS.fechaUltimaModificacion && (
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Última mod.</span>
                <span className="text-slate-700">{new Date(normaOS.fechaUltimaModificacion).toLocaleDateString('es-AR')}</span>
              </div>
            )}
            {normaOS.modificadoPor && (
              <div className="flex justify-between">
                <span className="text-slate-500 text-xs">Por</span>
                <span className="text-slate-700 truncate max-w-[100px]">{normaOS.modificadoPor}</span>
              </div>
            )}
            {!normaOS.fechaUltimaModificacion && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-rose-400" />
                <span className="text-xs text-slate-500">Cargada</span>
              </div>
            )}
          </div>
        )
      }
      return RESUMEN_CARD[id]
    }

    return RESUMEN_CARD[id]
  }

  const ejecutarBusqueda = () => {
    if (inputBuscar.trim()) {
      setBuscarQuery(inputBuscar.trim())
      setObraSelec(null)
    }
  }

  const limpiar = () => {
    setInputBuscar(''); setBuscarQuery(''); setObraSelec(null)
  }

  const seleccionar = (os: ObraSocialList) => setObraSelec(os)

  const irACard = (ruta: string) => {
    if (obraSelec) {
      navigate(`${ruta}?obraSocialId=${obraSelec.id}&obraSocialNombre=${encodeURIComponent(obraSelec.nombre)}`)
    } else {
      navigate(ruta)
    }
  }

  const banner = obraSelec ? ESTADO_BANNER[obraSelec.estado] : null

  return (
    <div className="p-6 space-y-6">

      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-azul rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Configuración Obra Social</h1>
          <p className="text-sm text-slate-500">Buscá una obra social para ver su configuración</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
              placeholder="Buscar por código, sigla o nombre... (Enter para buscar)"
              value={inputBuscar}
              onChange={e => setInputBuscar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ejecutarBusqueda()}
            />
          </div>
          <button
            onClick={ejecutarBusqueda}
            className="px-4 py-2.5 bg-azul hover:bg-azul-oscuro text-white text-sm font-medium rounded-xl transition-colors"
          >
            Buscar
          </button>
          {(buscarQuery || obraSelec) && (
            <button onClick={limpiar} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Resultados de búsqueda */}
        {isFetching && (
          <div className="mt-3 text-sm text-slate-400 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-azul border-t-transparent rounded-full animate-spin" />
            Buscando...
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
                  onClick={() => seleccionar(os)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-8 h-8 bg-azul/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} className="text-azul" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{os.nombre}</p>
                    <p className="text-xs text-slate-400">{os.sigla && `${os.sigla} · `}Cód. {os.codigo}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BANNER[os.estado].badge}`}>
                    {os.estado}
                  </span>
                </button>
              ))}
            </div>
          )
        )}
      </div>

      {/* Banner resumen de la OS seleccionada */}
      {obraSelec && banner && (
        <div className={`rounded-2xl border-2 p-5 ${banner.bg} ${banner.border}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              {/* Ícono grande */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${banner.badge}`}>
                <Building2 size={28} />
              </div>
              {/* Datos */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${banner.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${banner.dot}`} />
                    {obraSelec.estado}
                  </span>
                </div>
                <h2 className={`text-2xl font-bold ${banner.text}`}>{obraSelec.nombre}</h2>
                <div className={`flex items-center gap-4 mt-1 text-sm ${banner.text} opacity-80`}>
                  {obraSelec.sigla && (
                    <span className="font-medium">{obraSelec.sigla}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Hash size={12} />
                    Cód. {obraSelec.codigo}
                  </span>
                  {obraSelec.cuit && (
                    <span>CUIT: {obraSelec.cuit}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <ClipboardList size={12} />
                    {obraSelec.cantidadPlanes} {obraSelec.cantidadPlanes === 1 ? 'plan' : 'planes'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={limpiar}
              className={`p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity ${banner.text}`}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Grilla de cards */}
      <div>
        {!obraSelec && buscarQuery && (
          <p className="text-xs text-slate-400 mb-3">Seleccioná una obra social para ver su configuración detallada, o hacé click en una card para acceder al módulo general.</p>
        )}
        {!obraSelec && !buscarQuery && (
          <p className="text-xs text-slate-400 mb-3">Podés acceder a cada módulo directamente, o primero buscar una obra social para ver su contexto.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CARDS.map(card => {
            const Icono = card.icono
            return (
              <button
                key={card.id}
                onClick={() => irACard(card.ruta)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-left
                           hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5
                           transition-all duration-200 group cursor-pointer w-full"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                    <Icono size={20} />
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
                <h2 className="mt-3 text-base font-semibold text-slate-800">{card.titulo}</h2>
                {renderResumenCard(card.id)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
