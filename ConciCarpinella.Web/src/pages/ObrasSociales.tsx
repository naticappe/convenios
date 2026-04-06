// ============================================================
// PÁGINA DE OBRAS SOCIALES
// ============================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { obrasSocialesService } from '../services/obrasSocialesService'
import type {
  ObraSocialList, CrearEditarObraSocial,
  ContactoObraSocial, CrearEditarContactoObraSocial,
  VigenciaObraSocial, CrearVigenciaObraSocial,
  EstadoObraSocial
} from '../types'
import { Plus, Pencil, Trash2, Search, Building2, User, X, Phone, Mail, History } from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────
const ESTADOS: EstadoObraSocial[] = ['Activa', 'Suspendida', 'Baja']

const ESTADO_STYLE: Record<EstadoObraSocial, string> = {
  Activa:     'bg-green-100 text-green-700 hover:bg-green-200',
  Suspendida: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  Baja:       'bg-red-100 text-red-600 hover:bg-red-200',
}

const FORM_OS_INICIAL: CrearEditarObraSocial = {
  codigo: 0, sigla: '', nombre: '', cuit: '', observaciones: ''
}

const FORM_CONTACTO_INICIAL: CrearEditarContactoObraSocial = {
  nombre: '', descripcion: '', telefono: '', mail: ''
}

// ── Helpers ──────────────────────────────────────────────────
const fmtFecha = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// ── Componente principal ─────────────────────────────────────
export default function ObrasSociales() {
  const qc = useQueryClient()

  // Filtros
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modal OS
  const [modalOS, setModalOS]     = useState(false)
  const [editando, setEditando]   = useState<ObraSocialList | null>(null)
  const [formOS,   setFormOS]     = useState<CrearEditarObraSocial>(FORM_OS_INICIAL)
  const [errorOS,  setErrorOS]    = useState<string | null>(null)

  // Modal Contactos
  const [modalContactos, setModalContactos]   = useState(false)
  const [obraCtx, setObraCtx]                 = useState<ObraSocialList | null>(null)
  const [editandoCtc, setEditandoCtc]         = useState<ContactoObraSocial | null>(null)
  const [formCtc, setFormCtc]                 = useState<CrearEditarContactoObraSocial>(FORM_CONTACTO_INICIAL)
  const [formCtcAbierto, setFormCtcAbierto]   = useState(false)
  const [errorCtc, setErrorCtc]               = useState<string | null>(null)

  // Modal Vigencias
  const [modalVig, setModalVig]               = useState(false)
  const [obraVig, setObraVig]                 = useState<ObraSocialList | null>(null)
  const [formVigAbierto, setFormVigAbierto]   = useState(false)
  const [editandoVig, setEditandoVig]         = useState<VigenciaObraSocial | null>(null)
  const [formVig, setFormVig]                 = useState<CrearVigenciaObraSocial>({
    estado: 'Activa', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: ''
  })
  const [errorVig, setErrorVig]               = useState<string | null>(null)

  // ── Queries ─────────────────────────────────────────────────
  const params = {
    ...(filtroBuscar ? { buscar: filtroBuscar } : {}),
    ...(filtroEstado ? { estado: filtroEstado } : {}),
  }

  const { data: obras, isLoading } = useQuery({
    queryKey: ['obras-sociales', params],
    queryFn:  () => obrasSocialesService.listar(params)
  })

  const { data: contactos, isLoading: cargandoCtc } = useQuery({
    queryKey: ['contactos-os', obraCtx?.id],
    queryFn:  () => obrasSocialesService.listarContactos(obraCtx!.id),
    enabled:  !!obraCtx
  })

  const { data: vigencias, isLoading: cargandoVig } = useQuery({
    queryKey: ['vigencias-os', obraVig?.id],
    queryFn:  () => obrasSocialesService.listarVigencias(obraVig!.id),
    enabled:  !!obraVig
  })

  // ── Mutaciones OS ────────────────────────────────────────────
  const guardarOS = useMutation({
    mutationFn: (datos: CrearEditarObraSocial) =>
      editando
        ? obrasSocialesService.actualizar(editando.id, datos)
        : obrasSocialesService.crear(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['obras-sociales'] }); cerrarModalOS() },
    onError:   (err: Error) => setErrorOS(err.message)
  })

  // ── Mutaciones Contactos ─────────────────────────────────────
  const guardarCtc = useMutation({
    mutationFn: (datos: CrearEditarContactoObraSocial) =>
      editandoCtc
        ? obrasSocialesService.actualizarContacto(obraCtx!.id, editandoCtc.id, datos)
        : obrasSocialesService.crearContacto(obraCtx!.id, datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contactos-os', obraCtx?.id] }); cerrarFormCtc() },
    onError:   (err: Error) => setErrorCtc(err.message)
  })

  const eliminarCtc = useMutation({
    mutationFn: (id: number) => obrasSocialesService.eliminarContacto(obraCtx!.id, id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['contactos-os', obraCtx?.id] })
  })

  // ── Mutaciones Vigencias ─────────────────────────────────────
  const guardarVig = useMutation({
    mutationFn: (datos: CrearVigenciaObraSocial) =>
      editandoVig
        ? obrasSocialesService.actualizarVigencia(obraVig!.id, editandoVig.id, datos)
        : obrasSocialesService.crearVigencia(obraVig!.id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vigencias-os', obraVig?.id] })
      qc.invalidateQueries({ queryKey: ['obras-sociales'] })
      cerrarFormVig()
    },
    onError: (err: Error) => setErrorVig(err.message)
  })

  // ── Handlers OS ──────────────────────────────────────────────
  const abrirCrearOS = () => {
    setEditando(null); setFormOS(FORM_OS_INICIAL); setErrorOS(null); setModalOS(true)
  }

  const abrirEditarOS = async (obra: ObraSocialList) => {
    const d = await obrasSocialesService.obtener(obra.id)
    setEditando(obra)
    setFormOS({ codigo: d.codigo, sigla: d.sigla ?? '', nombre: d.nombre, cuit: d.cuit ?? '', observaciones: d.observaciones ?? '' })
    setErrorOS(null)
    setModalOS(true)
  }

  const cerrarModalOS = () => { setModalOS(false); setEditando(null); setFormOS(FORM_OS_INICIAL); setErrorOS(null) }

  // ── Handlers Contactos ───────────────────────────────────────
  const abrirContactos = (obra: ObraSocialList) => {
    setObraCtx(obra); setFormCtcAbierto(false); setEditandoCtc(null)
    setFormCtc(FORM_CONTACTO_INICIAL); setErrorCtc(null); setModalContactos(true)
  }

  const cerrarModalContactos = () => {
    setModalContactos(false); setObraCtx(null); setEditandoCtc(null)
    setFormCtcAbierto(false); setFormCtc(FORM_CONTACTO_INICIAL); setErrorCtc(null)
  }

  const abrirNuevoCtc = () => {
    setEditandoCtc(null); setFormCtc(FORM_CONTACTO_INICIAL); setErrorCtc(null); setFormCtcAbierto(true)
  }

  const abrirEditarCtc = (c: ContactoObraSocial) => {
    setEditandoCtc(c)
    setFormCtc({ nombre: c.nombre, descripcion: c.descripcion ?? '', telefono: c.telefono ?? '', mail: c.mail ?? '' })
    setErrorCtc(null); setFormCtcAbierto(true)
  }

  const cerrarFormCtc = () => {
    setFormCtcAbierto(false); setEditandoCtc(null); setFormCtc(FORM_CONTACTO_INICIAL); setErrorCtc(null)
  }

  // ── Handlers Vigencias ───────────────────────────────────────
  const abrirVigencias = (obra: ObraSocialList) => {
    setObraVig(obra); setFormVigAbierto(false); setEditandoVig(null)
    setFormVig({ estado: 'Activa', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: '' })
    setErrorVig(null); setModalVig(true)
  }

  const cerrarModalVig = () => {
    setModalVig(false); setObraVig(null); setEditandoVig(null)
    setFormVigAbierto(false); setErrorVig(null)
  }

  const abrirNuevaVig = () => {
    setEditandoVig(null)
    setFormVig({ estado: 'Activa', fechaDesde: new Date().toISOString().slice(0, 10), observaciones: '' })
    setErrorVig(null); setFormVigAbierto(true)
  }

  const abrirEditarVig = (v: VigenciaObraSocial) => {
    setEditandoVig(v)
    setFormVig({ estado: v.estado, fechaDesde: v.fechaDesde.slice(0, 10), observaciones: v.observaciones ?? '' })
    setErrorVig(null); setFormVigAbierto(true)
  }

  const cerrarFormVig = () => { setFormVigAbierto(false); setEditandoVig(null); setErrorVig(null) }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={22} className="text-azul" />
            Obras Sociales
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{obras?.length ?? 0} registros</p>
        </div>
        <button
          onClick={abrirCrearOS}
          className="flex items-center gap-2 bg-azul hover:bg-azul-oscuro text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Nueva Obra Social
        </button>
      </div>

      {/* ── Filtros ─────────────────────────────────────────── */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, sigla o nombre..."
            value={filtroBuscar}
            onChange={e => setFiltroBuscar(e.target.value)}
            className="pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 bg-white text-slate-700"
        >
          <option value="">Todos los estados</option>
          <option value="Activa">Activa</option>
          <option value="Suspendida">Suspendida</option>
          <option value="Baja">Baja</option>
        </select>
        {(filtroBuscar || filtroEstado) && (
          <button
            onClick={() => { setFiltroBuscar(''); setFiltroEstado('') }}
            className="text-xs text-slate-500 hover:text-slate-700 px-2"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Cargando...</div>
        ) : !obras?.length ? (
          <div className="p-10 text-center text-slate-400 text-sm">Sin resultados</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-10">ID</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Código</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Sigla</th>
                <th className="text-left px-5 py-3 text-slate-600 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 text-slate-600 font-semibold">CUIT</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">Planes</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">Estado</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {obras.map(obra => (
                <tr key={obra.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{obra.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-azul bg-azul/8 px-2 py-0.5 rounded text-xs">
                      {obra.codigo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                    {obra.sigla ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-800">{obra.nombre}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{obra.cuit ?? '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="bg-azul/10 text-azul text-xs font-medium px-2 py-0.5 rounded-full">
                      {obra.cantidadPlanes} planes
                    </span>
                  </td>
                  {/* Estado clickeable → abre historial vigencias */}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => abrirVigencias(obra)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${ESTADO_STYLE[obra.estado]}`}
                      title="Ver / cambiar estado"
                    >
                      {obra.estado}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => abrirContactos(obra)}
                        className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Contactos"
                      >
                        <User size={15} />
                      </button>
                      <button
                        onClick={() => abrirEditarOS(obra)}
                        className="p-1.5 text-azul hover:bg-azul/10 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — Crear / Editar Obra Social
      ══════════════════════════════════════════════════════ */}
      {modalOS && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {editando ? 'Editar Obra Social' : 'Nueva Obra Social'}
              </h2>
              <button onClick={cerrarModalOS} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <form onSubmit={e => { e.preventDefault(); guardarOS.mutate(formOS) }} className="p-6 space-y-4">
              {errorOS && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{errorOS}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Código <span className="text-red-400">*</span>
                  </label>
                  <input
                    required type="number" min={1}
                    value={formOS.codigo || ''}
                    onChange={e => setFormOS({ ...formOS, codigo: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sigla</label>
                  <input
                    value={formOS.sigla ?? ''}
                    onChange={e => setFormOS({ ...formOS, sigla: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <input
                    required value={formOS.nombre}
                    onChange={e => setFormOS({ ...formOS, nombre: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">CUIT</label>
                  <input
                    value={formOS.cuit ?? ''}
                    onChange={e => setFormOS({ ...formOS, cuit: e.target.value })}
                    placeholder="XX-XXXXXXXX-X"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                  <textarea
                    rows={2} value={formOS.observaciones ?? ''}
                    onChange={e => setFormOS({ ...formOS, observaciones: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarModalOS}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardarOS.isPending}
                  className="px-4 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg transition-colors disabled:opacity-60">
                  {guardarOS.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Contactos (ABM completo)
      ══════════════════════════════════════════════════════ */}
      {modalContactos && obraCtx && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <User size={16} className="text-azul" /> Contactos
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-azul font-semibold">{obraCtx.codigo}</span> · {obraCtx.nombre}
                </p>
              </div>
              <button onClick={cerrarModalContactos} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-3">
              {/* Lista */}
              {cargandoCtc ? (
                <p className="text-center text-slate-400 text-sm py-4">Cargando...</p>
              ) : contactos?.length ? (
                <div className="space-y-2">
                  {contactos.map(c => (
                    <div key={c.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 hover:bg-white transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm">{c.nombre}</p>
                          {c.descripcion && <p className="text-slate-500 text-xs mt-0.5">{c.descripcion}</p>}
                          <div className="flex flex-col gap-1 mt-2">
                            {c.telefono && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Phone size={11} className="text-slate-400 shrink-0" />{c.telefono}
                              </span>
                            )}
                            {c.mail && (
                              <span className="flex items-center gap-1.5 text-xs text-slate-600">
                                <Mail size={11} className="text-slate-400 shrink-0" />{c.mail}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => abrirEditarCtc(c)}
                            className="p-1.5 text-azul hover:bg-azul/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`¿Eliminar contacto "${c.nombre}"?`)) eliminarCtc.mutate(c.id) }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-400 text-sm py-4">Sin contactos registrados</p>
              )}

              {/* Formulario inline */}
              {formCtcAbierto ? (
                <div className="border border-azul/20 rounded-xl p-4 bg-blue-50/40 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {editandoCtc ? 'Editar contacto' : 'Nuevo contacto'}
                  </p>
                  {errorCtc && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">{errorCtc}</div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre <span className="text-red-400">*</span></label>
                    <input
                      required value={formCtc.nombre}
                      onChange={e => setFormCtc({ ...formCtc, nombre: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                    <input
                      value={formCtc.descripcion ?? ''}
                      onChange={e => setFormCtc({ ...formCtc, descripcion: e.target.value })}
                      placeholder="Cargo, área, rol..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                      <input
                        value={formCtc.telefono ?? ''}
                        onChange={e => setFormCtc({ ...formCtc, telefono: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Mail</label>
                      <input
                        type="email" value={formCtc.mail ?? ''}
                        onChange={e => setFormCtc({ ...formCtc, mail: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={cerrarFormCtc}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={guardarCtc.isPending || !formCtc.nombre.trim()}
                      onClick={() => guardarCtc.mutate(formCtc)}
                      className="px-3 py-1.5 text-xs bg-azul hover:bg-azul-oscuro text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {guardarCtc.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={abrirNuevoCtc}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-azul hover:text-azul text-slate-400 rounded-xl py-2.5 text-sm transition-colors"
                >
                  <Plus size={15} /> Agregar contacto
                </button>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={cerrarModalContactos}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Vigencias (historial de estados)
      ══════════════════════════════════════════════════════ */}
      {modalVig && obraVig && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <History size={16} className="text-azul" /> Historial de Estados
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-azul font-semibold">{obraVig.codigo}</span> · {obraVig.nombre}
                </p>
              </div>
              <button onClick={cerrarModalVig} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-3">
              {/* Tabla de vigencias */}
              {cargandoVig ? (
                <p className="text-center text-slate-400 text-sm py-4">Cargando...</p>
              ) : vigencias?.length ? (
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Hasta</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Obs.</th>
                        <th className="px-2 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vigencias.map((v, i) => (
                        <tr key={v.id} className={i === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ESTADO_STYLE[v.estado]}`}>
                              {v.estado}
                            </span>
                            {i === 0 && (
                              <span className="ml-1.5 text-xs text-slate-400 font-normal">← actual</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">{fmtFecha(v.fechaDesde)}</td>
                          <td className="px-4 py-2.5 text-xs text-slate-600 font-mono">
                            {v.fechaHasta ? fmtFecha(v.fechaHasta) : <span className="text-slate-400">vigente</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[120px] truncate" title={v.observaciones ?? ''}>
                            {v.observaciones ?? '—'}
                          </td>
                          <td className="px-2 py-2.5">
                            <button
                              onClick={() => abrirEditarVig(v)}
                              className="p-1 text-azul hover:bg-azul/10 rounded transition-colors"
                              title="Editar vigencia"
                            >
                              <Pencil size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-400 text-sm py-4">Sin historial</p>
              )}

              {/* Formulario nuevo estado / editar vigencia */}
              {formVigAbierto ? (
                <div className="border border-azul/20 rounded-xl p-4 bg-blue-50/40 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">
                    {editandoVig ? 'Editar vigencia' : 'Registrar nuevo estado'}
                  </p>
                  {errorVig && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">{errorVig}</div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Estado <span className="text-red-400">*</span></label>
                      <select
                        value={formVig.estado}
                        onChange={e => setFormVig({ ...formVig, estado: e.target.value as EstadoObraSocial })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                      >
                        {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Fecha desde <span className="text-red-400">*</span></label>
                      <input
                        type="date" value={formVig.fechaDesde}
                        onChange={e => setFormVig({ ...formVig, fechaDesde: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                    <input
                      value={formVig.observaciones ?? ''}
                      onChange={e => setFormVig({ ...formVig, observaciones: e.target.value })}
                      placeholder="Motivo del cambio..."
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={cerrarFormVig}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={guardarVig.isPending || !formVig.fechaDesde}
                      onClick={() => guardarVig.mutate(formVig)}
                      className="px-3 py-1.5 text-xs bg-azul hover:bg-azul-oscuro text-white rounded-lg transition-colors disabled:opacity-60"
                    >
                      {guardarVig.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={abrirNuevaVig}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 hover:border-azul hover:text-azul text-slate-400 rounded-xl py-2.5 text-sm transition-colors"
                >
                  <Plus size={15} /> Registrar nuevo estado
                </button>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={cerrarModalVig}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
