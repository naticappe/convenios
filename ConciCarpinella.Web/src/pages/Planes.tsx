// ============================================================
// PÁGINA DE PLANES
// Accesible desde Configuración OS.
// Recibe obraSocialId y obraSocialNombre por URL params.
// ============================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { planesService } from '../services/planesService'
import type {
  PlanList, CrearEditarPlan,
  VigenciaPlan, CrearVigenciaPlan,
  EstadoPlan, TipoIva
} from '../types'
import { Plus, Pencil, Search, ClipboardList, X, History, ChevronLeft, Building2, CheckSquare, Square } from 'lucide-react'

// ── Constantes ────────────────────────────────────────────────
const ESTADOS: EstadoPlan[] = ['Activo', 'Baja']

const ESTADO_STYLE: Record<EstadoPlan, string> = {
  Activo: 'bg-green-100 text-green-700 hover:bg-green-200',
  Baja:   'bg-red-100  text-red-600   hover:bg-red-200',
}

const TIPO_IVA_OPCIONES: { valor: TipoIva; label: string; chip: string }[] = [
  { valor: 'Exento',     label: 'Exento', chip: 'bg-slate-100 text-slate-600'   },
  { valor: 'Gravado105', label: '10,5%',  chip: 'bg-blue-100  text-blue-600'    },
  { valor: 'Gravado21',  label: '21%',    chip: 'bg-orange-100 text-orange-600' },
]

const tipoIvaChip = (valor: TipoIva) =>
  TIPO_IVA_OPCIONES.find(o => o.valor === valor) ?? TIPO_IVA_OPCIONES[0]

const FORM_INICIAL = (obraSocialId: number): CrearEditarPlan => ({
  nombre: '', alias: '', descripcion: '', tipoIva: 'Exento',
  obraSocialId,
  esAutogestion: false,
  fechaDesde: new Date().toISOString().slice(0, 10),
  fechaHasta: ''
})

const fmtFecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// ── Componente principal ──────────────────────────────────────
export default function Planes() {
  const qc              = useQueryClient()
  const navigate        = useNavigate()
  const [searchParams]  = useSearchParams()

  // Contexto de obra social desde la URL
  const obraSocialId     = Number(searchParams.get('obraSocialId')) || undefined
  const obraSocialNombre = searchParams.get('obraSocialNombre') ?? ''

  // Filtros
  const [filtroNombre, setFiltroNombre] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modal plan
  const [modalPlan, setModalPlan]   = useState(false)
  const [editando,  setEditando]    = useState<PlanList | null>(null)
  const [form,      setForm]        = useState<CrearEditarPlan>(FORM_INICIAL(obraSocialId ?? 0))
  const [errorPlan, setErrorPlan]   = useState<string | null>(null)

  // Modal vigencias
  const [modalVig,       setModalVig]       = useState(false)
  const [planVig,        setPlanVig]        = useState<PlanList | null>(null)
  const [formVigAbierto, setFormVigAbierto] = useState(false)
  const [editandoVig,    setEditandoVig]    = useState<VigenciaPlan | null>(null)
  const [formVig,        setFormVig]        = useState<CrearVigenciaPlan>({
    estado: 'Activo', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: ''
  })
  const [errorVig, setErrorVig] = useState<string | null>(null)

  // ── Queries ──────────────────────────────────────────────────
  const params = {
    ...(obraSocialId  ? { obraSocialId }           : {}),
    ...(filtroNombre  ? { nombre: filtroNombre }   : {}),
    ...(filtroEstado  ? { estado: filtroEstado }   : {}),
  }

  const { data: planes, isLoading } = useQuery({
    queryKey: ['planes', params],
    queryFn:  () => planesService.listar(params)
  })

  const { data: vigencias, isLoading: cargandoVig } = useQuery({
    queryKey: ['vigencias-plan', planVig?.id],
    queryFn:  () => planesService.listarVigencias(planVig!.id),
    enabled:  !!planVig
  })

  // ── Mutaciones ───────────────────────────────────────────────
  const guardarPlan = useMutation({
    mutationFn: (datos: CrearEditarPlan) =>
      editando ? planesService.actualizar(editando.id, datos) : planesService.crear(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planes'] }); cerrarModalPlan() },
    onError:   (err: Error) => setErrorPlan(err.message)
  })

  const guardarVig = useMutation({
    mutationFn: (datos: CrearVigenciaPlan) =>
      editandoVig
        ? planesService.actualizarVigencia(planVig!.id, editandoVig.id, datos)
        : planesService.crearVigencia(planVig!.id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vigencias-plan', planVig?.id] })
      qc.invalidateQueries({ queryKey: ['planes'] })
      cerrarFormVig()
    },
    onError: (err: Error) => setErrorVig(err.message)
  })

  // ── Handlers ─────────────────────────────────────────────────
  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_INICIAL(obraSocialId ?? 0))
    setErrorPlan(null)
    setModalPlan(true)
  }

  const abrirEditar = async (plan: PlanList) => {
    const d = await planesService.obtener(plan.id)
    setEditando(plan)
    setForm({
      nombre: d.nombre, alias: d.alias ?? '', descripcion: d.descripcion ?? '',
      tipoIva: d.tipoIva, obraSocialId: d.obraSocialId,
      esAutogestion: d.esAutogestion,
      fechaDesde: new Date().toISOString().slice(0, 10), fechaHasta: ''
    })
    setErrorPlan(null)
    setModalPlan(true)
  }

  const cerrarModalPlan = () => {
    setModalPlan(false); setEditando(null)
    setForm(FORM_INICIAL(obraSocialId ?? 0)); setErrorPlan(null)
  }

  const abrirVigencias = (plan: PlanList) => {
    setPlanVig(plan); setFormVigAbierto(false); setEditandoVig(null)
    setFormVig({ estado: 'Activo', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: '' })
    setErrorVig(null); setModalVig(true)
  }

  const cerrarModalVig  = () => { setModalVig(false); setPlanVig(null); setEditandoVig(null); setFormVigAbierto(false); setErrorVig(null) }
  const abrirNuevaVig   = () => { setEditandoVig(null); setFormVig({ estado: 'Activo', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: '' }); setErrorVig(null); setFormVigAbierto(true) }
  const abrirEditarVig  = (v: VigenciaPlan) => { setEditandoVig(v); setFormVig({ estado: v.estado, fechaDesde: v.fechaDesde.slice(0,10), observaciones: v.observaciones ?? '' }); setErrorVig(null); setFormVigAbierto(true) }
  const cerrarFormVig   = () => { setFormVigAbierto(false); setEditandoVig(null); setErrorVig(null) }

  const volver = () => navigate('/configuracion-obra-social')

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={volver} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-9 h-9 bg-azul rounded-xl flex items-center justify-center">
            <ClipboardList size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Planes</h1>
            {obraSocialNombre
              ? <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 size={13} className="text-azul" />
                  <span className="font-medium text-azul">{obraSocialNombre}</span>
                </div>
              : <p className="text-sm text-slate-500">Todos los planes</p>
            }
          </div>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-azul hover:bg-azul-oscuro text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
            placeholder="Buscar por nombre..."
            value={filtroNombre}
            onChange={e => setFiltroNombre(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 bg-white text-slate-700"
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-azul border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !planes?.length ? (
          <div className="text-center py-16 text-slate-400 text-sm">No se encontraron planes</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Alias paciente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Obra Social</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">IVA</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Autogestión</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planes.map(plan => {
                const iva = tipoIvaChip(plan.tipoIva)
                return (
                  <tr key={plan.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{plan.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{plan.alias ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{plan.obraSocial}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${iva.chip}`}>
                        {iva.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {plan.esAutogestion
                        ? <CheckSquare size={16} className="text-azul mx-auto" />
                        : <Square      size={16} className="text-slate-300 mx-auto" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => abrirVigencias(plan)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${ESTADO_STYLE[plan.estado]}`}
                      >
                        {plan.estado}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirEditar(plan)}
                        className="p-1.5 text-slate-400 hover:text-azul hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL PLAN ──────────────────────────────────────────── */}
      {modalPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{editando ? 'Editar plan' : 'Nuevo plan'}</h2>
                {obraSocialNombre && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Building2 size={11} className="text-azul" />
                    <span className="text-azul font-medium">{obraSocialNombre}</span>
                  </p>
                )}
              </div>
              <button onClick={cerrarModalPlan} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form className="p-6 space-y-4" onSubmit={e => { e.preventDefault(); guardarPlan.mutate(form) }}>
              {errorPlan && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{errorPlan}</div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre (facturación) *</label>
                <input
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Nombre para facturación"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                />
              </div>

              {/* Alias */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alias (nombre para el paciente)</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Nombre visible para el paciente"
                  value={form.alias ?? ''}
                  onChange={e => setForm(f => ({ ...f, alias: e.target.value }))}
                />
              </div>

              {/* Tipo IVA */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de IVA *</label>
                <div className="flex gap-2">
                  {TIPO_IVA_OPCIONES.map(op => (
                    <button
                      key={op.valor} type="button"
                      onClick={() => setForm(f => ({ ...f, tipoIva: op.valor }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                        form.tipoIva === op.valor
                          ? `${op.chip} border-current`
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Autogestión */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, esAutogestion: !f.esAutogestion }))}
                    className="flex-shrink-0"
                  >
                    {form.esAutogestion
                      ? <CheckSquare size={20} className="text-azul" />
                      : <Square      size={20} className="text-slate-300 group-hover:text-slate-400" />
                    }
                  </button>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Autogestión</span>
                    <p className="text-xs text-slate-400">Tratado como Obra Social en módulos de autogestión</p>
                  </div>
                </label>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 resize-none"
                  placeholder="Descripción opcional"
                  value={form.descripcion ?? ''}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
              </div>

              {/* Vigencia inicial — solo en alta */}
              {!editando && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Vigencia inicial</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Desde *</label>
                      <input
                        required type="date"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                        value={form.fechaDesde}
                        onChange={e => setForm(f => ({ ...f, fechaDesde: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hasta (opcional)</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                        value={form.fechaHasta ?? ''}
                        onChange={e => setForm(f => ({ ...f, fechaHasta: e.target.value || undefined }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarModalPlan} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit" disabled={guardarPlan.isPending}
                  className="px-4 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {guardarPlan.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VIGENCIAS ─────────────────────────────────────── */}
      {modalVig && planVig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <History size={18} className="text-slate-500" />
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Vigencias</h2>
                  <p className="text-sm text-slate-500">{planVig.nombre}</p>
                </div>
              </div>
              <button onClick={cerrarModalVig} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {cargandoVig ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-4 border-azul border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !vigencias?.length ? (
                <p className="text-sm text-slate-400 text-center py-4">Sin historial de vigencias</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Estado</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Desde</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Hasta</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Observaciones</th>
                      <th className="text-right px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {vigencias.map(v => (
                      <tr key={v.id} className="border-b border-slate-50">
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_STYLE[v.estado]}`}>
                            {v.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{fmtFecha(v.fechaDesde)}</td>
                        <td className="px-3 py-2 text-slate-500">
                          {v.fechaHasta ? fmtFecha(v.fechaHasta) : <span className="text-green-500 text-xs font-medium">Vigente</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate">{v.observaciones ?? '—'}</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => abrirEditarVig(v)} className="p-1 text-slate-400 hover:text-azul hover:bg-blue-50 rounded transition-colors">
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {!formVigAbierto ? (
                <button onClick={abrirNuevaVig} className="flex items-center gap-2 text-sm text-azul hover:text-azul-oscuro font-medium">
                  <Plus size={15} /> Registrar nuevo estado
                </button>
              ) : (
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <p className="text-sm font-semibold text-slate-700">{editandoVig ? 'Editar vigencia' : 'Nuevo estado'}</p>
                  {errorVig && <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">{errorVig}</div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                      <select
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 bg-white"
                        value={formVig.estado}
                        onChange={e => setFormVig(f => ({ ...f, estado: e.target.value as EstadoPlan }))}
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde *</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                        value={formVig.fechaDesde}
                        onChange={e => setFormVig(f => ({ ...f, fechaDesde: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 resize-none"
                      value={formVig.observaciones ?? ''}
                      onChange={e => setFormVig(f => ({ ...f, observaciones: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={cerrarFormVig} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                    <button
                      type="button" disabled={guardarVig.isPending}
                      onClick={() => guardarVig.mutate(formVig)}
                      className="px-3 py-1.5 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {guardarVig.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
