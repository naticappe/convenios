// ============================================================
// PÁGINA: Home del módulo Nomencladores
// Muestra resumen de los 5 submódulos con cards y solapas.
// ============================================================

import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api'
import { RefreshCw } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────
const fmtFechaHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

// ── Definición de submódulos ──────────────────────────────────
const SUBMODULOS = [
  {
    key:     'nomencladores',
    label:   'Nomencladores',
    desc:    'Tipos de nomencladores médicos vigentes',
    ruta:    '/nomencladores/nomencladores',
    apiList: '/nomenclador?estado=Vigente',
    apiAud:  '/nomenclador/auditoria',
  },
  {
    key:     'practicas',
    label:   'Prácticas',
    desc:    'Prácticas médicas registradas',
    ruta:    '/nomencladores/practicas',
    apiList: '/practicas?estado=Vigente',
    apiAud:  '/practicas/auditoria',
  },
  {
    key:     'clasificador',
    label:   'Agrupador de Prácticas',
    desc:    'Clasificación jerárquica de prácticas',
    ruta:    '/nomencladores/clasificador-practicas',
    apiList: '/clasificadorespractica?estado=Activo',
    apiAud:  '/clasificadorespractica/auditoria',
  },
  {
    key:     'unidad-arancel',
    label:   'Unidades Arancel',
    desc:    'Unidades arancelarias disponibles',
    ruta:    '/nomencladores/unidad-arancel',
    apiList: '/unidad-arancel?estado=Vigente',
    apiAud:  '/unidad-arancel/auditoria',
  },
  {
    key:     'conceptos',
    label:   'Conceptos',
    desc:    'Conceptos asociados a prácticas médicas',
    ruta:    '/nomencladores/conceptos',
    apiList: '/concepto?estado=Vigente',
    apiAud:  '/concepto/auditoria',
  },
]

// ── Card individual ────────────────────────────────────────────
function CardSubmodulo({
  label, desc, ruta, apiList, apiAud,
}: typeof SUBMODULOS[0]) {
  const navigate = useNavigate()

  const { data: lista = [], isLoading: loadingLista } = useQuery<unknown[]>({
    queryKey: ['home-card-lista', apiList],
    queryFn:  () => api.get(apiList).then(r => r.data),
    retry: false,
  })

  const { data: auditoria = [], isLoading: loadingAud } = useQuery<{ accion: string; usuarioNombre: string; fechaEvento: string }[]>({
    queryKey: ['home-card-aud', apiAud],
    queryFn:  () => api.get(apiAud).then(r => r.data),
    retry: false,
  })

  const ultimoAudit = auditoria[0]
  const loading = loadingLista || loadingAud

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-azul/40 transition-all duration-150 flex flex-col gap-3"
      onClick={() => navigate(ruta)}
    >
      {/* Nombre del submódulo */}
      <div>
        <h3 className="text-base font-semibold text-slate-800">{label}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>

      {/* Estadísticas */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
          <RefreshCw size={14} className="animate-spin" />
          Cargando...
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Vigentes</span>
            <span className="text-sm font-bold text-azul">{lista.length}</span>
          </div>
          {ultimoAudit ? (
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-1">
              <span className="font-medium text-slate-600">{ultimoAudit.accion}</span>
              {' · '}{ultimoAudit.usuarioNombre}
              <br />
              <span>{fmtFechaHora(ultimoAudit.fechaEvento)}</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-1">
              Sin registros de auditoría
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-auto pt-2 border-t border-slate-100">
        <span className="text-xs font-medium text-azul hover:text-azul-oscuro">
          Ir al módulo →
        </span>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function NomencladoresHome() {
  return (
    <div>
      {/* Descripción */}
      <p className="text-slate-500 text-sm mb-6">
        Gestión centralizada de nomencladores, prácticas y clasificaciones
      </p>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SUBMODULOS.map(({ key, ...rest }) => (
          <CardSubmodulo key={key} {...rest} />
        ))}
      </div>
    </div>
  )
}
