// ============================================================
// PÁGINA: Unidad Arancel
// Módulo de gestión de unidades arancelarias.
// Solapas: 1. Maestro  |  2. Auditoría
// ============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { unidadArancelService } from '../services/unidadArancelService'
import type {
  UnidadArancelList, CrearEditarUnidadArancel,
  UnidadArancelAuditLog, EstadoUnidadArancel,
  UnidadArancelImportPreview, UnidadArancelImportPreviewRow
} from '../types'
import {
  Plus, Pencil, Search, X, Download, Upload,
  History, CheckCircle2, XCircle, Clock, ChevronDown,
  RefreshCw, AlertTriangle
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────
const ESTADOS: EstadoUnidadArancel[] = ['Vigente', 'Inactivo']

const ACCIONES_AUDITORIA = [
  'ALTA', 'MODIFICACION', 'BAJA_LOGICA', 'CAMBIO_VIGENCIA',
  'CAMBIO_ESTADO', 'IMPORTACION'
]

const LABEL_ACCION: Record<string, string> = {
  ALTA:            'Alta',
  MODIFICACION:    'Modificación',
  BAJA_LOGICA:     'Baja lógica',
  CAMBIO_VIGENCIA: 'Cambio vigencia',
  CAMBIO_ESTADO:   'Cambio estado',
  IMPORTACION:     'Importación',
}

const HOY = new Date().toISOString().slice(0, 10)

const FORM_INICIAL: CrearEditarUnidadArancel = {
  nombre: '', vigenciaDesde: HOY, vigenciaHasta: HOY,
}

// ── Helpers ──────────────────────────────────────────────────
// Parsea "yyyy-MM-dd" directamente sin pasar por new Date(),
// que interpreta la cadena como UTC medianoche y en AR (UTC-3)
// la desplaza al día anterior.
const fmtFecha = (iso?: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

const fmtFechaHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

// ── Componente principal ─────────────────────────────────────
export default function UnidadArancelPage() {
  const qc = useQueryClient()

  // ── Solapas ──────────────────────────────────────────────────
  const [solapa, setSolapa] = useState<'maestro' | 'auditoria'>('maestro')

  // ── Filtros Maestro ──────────────────────────────────────────
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // ── Modal Alta/Edición ───────────────────────────────────────
  const [modalForm, setModalForm]   = useState(false)
  const [editando, setEditando]     = useState<UnidadArancelList | null>(null)
  const [form, setForm]             = useState<CrearEditarUnidadArancel>(FORM_INICIAL)
  const [errorForm, setErrorForm]   = useState<string | null>(null)

  // ── Modal Historial (per-row) ────────────────────────────────
  const [modalHistorial, setModalHistorial] = useState(false)
  const [historialUnidad, setHistorialUnidad] = useState<UnidadArancelList | null>(null)

  // ── Modal Importación ────────────────────────────────────────
  const [modalImport, setModalImport]   = useState(false)
  const [preview, setPreview]           = useState<UnidadArancelImportPreview | null>(null)
  const [importError, setImportError]   = useState<string | null>(null)
  const [importando, setImportando]     = useState(false)
  const [importOk, setImportOk]         = useState<{ creadas: number; actualizadas: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Filtros Auditoría ────────────────────────────────────────
  const [audUsuario, setAudUsuario]   = useState('')
  const [audAccion, setAudAccion]     = useState('')
  const [audDesde, setAudDesde]       = useState('')
  const [audHasta, setAudHasta]       = useState('')

  // ── Queries ──────────────────────────────────────────────────
  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades-arancel', filtroBuscar, filtroEstado],
    queryFn:  () => unidadArancelService.listar({
      ...(filtroBuscar ? { buscar: filtroBuscar } : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    }),
  })

  const { data: historialData = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['ua-historial', historialUnidad?.id],
    queryFn:  () => unidadArancelService.auditoriaPorId(historialUnidad!.id),
    enabled:  !!historialUnidad,
  })

  const { data: auditoriaData = [], isLoading: loadingAuditoria } = useQuery({
    queryKey: ['ua-auditoria', audUsuario, audAccion, audDesde, audHasta],
    queryFn:  () => unidadArancelService.auditoriaGlobal({
      ...(audUsuario ? { usuarioNombre: audUsuario } : {}),
      ...(audAccion  ? { accion: audAccion }         : {}),
      ...(audDesde   ? { fechaDesde: audDesde }      : {}),
      ...(audHasta   ? { fechaHasta: audHasta }      : {}),
    }),
    enabled: solapa === 'auditoria',
  })

  // ── Mutaciones ───────────────────────────────────────────────
  const guardar = useMutation({
    mutationFn: (datos: CrearEditarUnidadArancel) =>
      editando
        ? unidadArancelService.actualizar(editando.id, datos)
        : unidadArancelService.crear(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades-arancel'] })
      cerrarModal()
    },
    onError: (err: Error) => setErrorForm(err.message),
  })

  const toggleEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      unidadArancelService.actualizarEstado(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['unidades-arancel'] }),
  })

  // ── Handlers ─────────────────────────────────────────────────
  function abrirCrear() {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
    setModalForm(true)
  }

  function abrirEditar(u: UnidadArancelList) {
    setEditando(u)
    setForm({ nombre: u.nombre, vigenciaDesde: u.vigenciaDesde, vigenciaHasta: u.vigenciaHasta })
    setErrorForm(null)
    setModalForm(true)
  }

  function cerrarModal() {
    setModalForm(false)
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
  }

  function abrirHistorial(u: UnidadArancelList) {
    setHistorialUnidad(u)
    setModalHistorial(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim()) { setErrorForm('El nombre es obligatorio.'); return }
    if (!form.vigenciaDesde)  { setErrorForm('Vigencia desde es obligatoria.'); return }
    if (!form.vigenciaHasta)  { setErrorForm('Vigencia hasta es obligatoria.'); return }
    if (form.vigenciaHasta < form.vigenciaDesde) {
      setErrorForm('Vigencia hasta debe ser ≥ vigencia desde.')
      return
    }
    setErrorForm(null)
    guardar.mutate(form)
  }

  // ── Export ───────────────────────────────────────────────────
  async function handleExportar() {
    try {
      const blob = await unidadArancelService.exportar()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `unidades-arancel-${HOY}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Error al exportar.')
    }
  }

  // ── Import ───────────────────────────────────────────────────
  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    setPreview(null)
    setImportOk(null)
    setImportando(true)
    try {
      const data = await unidadArancelService.importarPreview(file)
      setPreview(data)
    } catch (err: unknown) {
      setImportError((err as Error).message ?? 'Error al procesar el archivo.')
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleConfirmarImport() {
    if (!preview) return
    setImportando(true)
    setImportError(null)
    try {
      const result = await unidadArancelService.importarConfirmar({
        transactionId: preview.transactionId,
        filas: preview.filas.map(f => ({
          nombre:        f.nombreImport,
          vigenciaDesde: f.vigenciaDesdeImport,
          vigenciaHasta: f.vigenciaHastaImport,
        })),
      })
      setImportOk(result)
      setPreview(null)
      qc.invalidateQueries({ queryKey: ['unidades-arancel'] })
      qc.invalidateQueries({ queryKey: ['ua-auditoria'] })
    } catch (err: unknown) {
      setImportError((err as Error).message ?? 'Error al confirmar importación.')
    } finally {
      setImportando(false)
    }
  }

  function cerrarImport() {
    setModalImport(false)
    setPreview(null)
    setImportError(null)
    setImportOk(null)
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-2xl">💲</span>
            Unidad Arancel
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading ? '…' : `${unidades.length} registros`}
          </p>
        </div>
      </div>

      {/* Solapas */}
      <div className="flex border-b border-slate-200 mb-6 gap-1">
        {([
          { key: 'maestro',   label: 'Maestro' },
          { key: 'auditoria', label: 'Auditoría' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSolapa(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              solapa === tab.key
                ? 'bg-white border border-b-white border-slate-200 text-azul -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───────── SOLAPA MAESTRO ───────── */}
      {solapa === 'maestro' && (
        <div className="flex flex-col gap-4 flex-1">

          {/* Barra de acciones */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Buscador */}
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filtroBuscar}
                onChange={e => setFiltroBuscar(e.target.value)}
                placeholder="Buscar por nombre..."
                className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
              />
              {filtroBuscar && (
                <button onClick={() => setFiltroBuscar('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtro estado */}
            <div className="relative">
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-azul/30 appearance-none bg-white"
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Botones derecha */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleExportar}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Download size={15} />
                Exportar
              </button>
              <button
                onClick={() => { setImportOk(null); setPreview(null); setImportError(null); setModalImport(true) }}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Upload size={15} />
                Importar
              </button>
              <button
                onClick={abrirCrear}
                className="flex items-center gap-1.5 px-4 py-2 bg-azul text-white rounded-lg text-sm font-medium hover:bg-azul/90 transition-colors shadow-sm"
              >
                <Plus size={15} />
                Nueva Unidad
              </button>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
              </div>
            ) : unidades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <span className="text-4xl mb-3">💲</span>
                <p className="text-sm">No hay unidades arancel registradas</p>
                <button onClick={abrirCrear} className="mt-3 text-azul text-sm hover:underline">
                  Crear la primera
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium w-12">ID</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Vigencia Desde</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Vigencia Hasta</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Estado</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unidades.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">{u.id}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(u.vigenciaDesde)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(u.vigenciaHasta)}</td>
                      <td className="px-4 py-3">
                        <ChipEstado estado={u.estado} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Ver historial */}
                          <button
                            title="Ver historial"
                            onClick={() => abrirHistorial(u)}
                            className="p-1.5 text-slate-400 hover:text-azul hover:bg-blue-50 rounded transition-colors"
                          >
                            <Clock size={15} />
                          </button>
                          {/* Editar */}
                          <button
                            title="Editar"
                            onClick={() => abrirEditar(u)}
                            className="p-1.5 text-slate-400 hover:text-azul hover:bg-blue-50 rounded transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          {/* Atajo de vigencia: cierra/reabre fecha_hasta */}
                          <button
                            title={u.activo
                              ? 'Cerrar vigencia — fecha hasta = ayer'
                              : 'Reabrir vigencia — fecha hasta = 31/12/9999'}
                            onClick={() => toggleEstado.mutate({ id: u.id, activo: !u.activo })}
                            className={`p-1.5 rounded transition-colors ${
                              u.activo
                                ? 'text-green-500 hover:text-red-500 hover:bg-red-50'
                                : 'text-red-400 hover:text-green-500 hover:bg-green-50'
                            }`}
                          >
                            {u.activo ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ───────── SOLAPA AUDITORÍA ───────── */}
      {solapa === 'auditoria' && (
        <div className="flex flex-col gap-4 flex-1">

          {/* Filtros auditoría */}
          <div className="flex flex-wrap gap-3">
            <input
              value={audUsuario}
              onChange={e => setAudUsuario(e.target.value)}
              placeholder="Filtrar por usuario..."
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30 flex-1 min-w-40"
            />
            <div className="relative">
              <select
                value={audAccion}
                onChange={e => setAudAccion(e.target.value)}
                className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none appearance-none bg-white"
              >
                <option value="">Todas las acciones</option>
                {ACCIONES_AUDITORIA.map(a => (
                  <option key={a} value={a}>{LABEL_ACCION[a] ?? a}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Desde</label>
              <input type="date" value={audDesde} onChange={e => setAudDesde(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Hasta</label>
              <input type="date" value={audHasta} onChange={e => setAudHasta(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30" />
            </div>
            {(audUsuario || audAccion || audDesde || audHasta) && (
              <button onClick={() => { setAudUsuario(''); setAudAccion(''); setAudDesde(''); setAudHasta('') }}
                className="text-xs text-slate-500 hover:text-red-500 flex items-center gap-1">
                <X size={13} /> Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla auditoría */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {loadingAuditoria ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw size={20} className="animate-spin mr-2" /> Cargando...
              </div>
            ) : auditoriaData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <History size={32} className="mb-3 opacity-50" />
                <p className="text-sm">Sin registros de auditoría</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Fecha / Hora</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Unidad</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Operación</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Usuario</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Origen</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Cambios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditoriaData.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {fmtFechaHora(log.fechaEvento)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {log.nombreUnidad}
                      </td>
                      <td className="px-4 py-3">
                        <ChipAccion accion={log.accion} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">{log.usuarioNombre}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.origen === 'IMPORTACION'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {log.origen}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 max-w-xs">
                        <CambiosResumen log={log} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ MODAL ALTA / EDICIÓN ═══════════ */}
      {modalForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">
                {editando ? 'Editar Unidad Arancel' : 'Nueva Unidad Arancel'}
              </h2>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Valor Módulo Anestesia"
                  maxLength={150}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vigencia Desde <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.vigenciaDesde}
                    onChange={e => setForm(f => ({ ...f, vigenciaDesde: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vigencia Hasta <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.vigenciaHasta}
                    onChange={e => setForm(f => ({ ...f, vigenciaHasta: e.target.value }))}
                    min={form.vigenciaDesde}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-azul/30"
                  />
                </div>
              </div>

              {errorForm && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                  {errorForm}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={cerrarModal}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={guardar.isPending}
                  className="flex-1 px-4 py-2 bg-azul text-white rounded-lg text-sm font-medium hover:bg-azul/90 transition-colors disabled:opacity-60">
                  {guardar.isPending ? 'Guardando…' : (editando ? 'Guardar cambios' : 'Crear unidad')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL HISTORIAL ═══════════ */}
      {modalHistorial && historialUnidad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-semibold text-slate-800">Historial de cambios</h2>
                <p className="text-xs text-slate-500 mt-0.5">{historialUnidad.nombre}</p>
              </div>
              <button onClick={() => setModalHistorial(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loadingHistorial ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" /> Cargando...
                </div>
              ) : historialData.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-slate-400">
                  <History size={28} className="mb-2 opacity-50" />
                  <p className="text-sm">Sin historial registrado</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historialData.map(log => (
                    <div key={log.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <ChipAccion accion={log.accion} />
                        <span className="text-xs text-slate-400">{fmtFechaHora(log.fechaEvento)}</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-1">Por: <span className="text-slate-700">{log.usuarioNombre}</span></p>
                      <CambiosResumen log={log} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL IMPORTACIÓN ═══════════ */}
      {modalImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Importar Unidades Arancel</h2>
              <button onClick={cerrarImport} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Éxito */}
              {importOk && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <CheckCircle2 size={48} className="text-green-500" />
                  <p className="text-lg font-semibold text-slate-800">Importación completada</p>
                  <p className="text-sm text-slate-500">
                    Creadas: <strong>{importOk.creadas}</strong> &nbsp;·&nbsp;
                    Actualizadas: <strong>{importOk.actualizadas}</strong>
                  </p>
                  <button onClick={cerrarImport}
                    className="mt-2 px-6 py-2 bg-azul text-white rounded-lg text-sm font-medium hover:bg-azul/90">
                    Cerrar
                  </button>
                </div>
              )}

              {/* Selección de archivo */}
              {!importOk && !preview && (
                <>
                  <p className="text-sm text-slate-600">
                    Subí un archivo Excel con el mismo formato que el exportado
                    (columnas: <strong>ID, Nombre, Vigencia Desde, Vigencia Hasta, Activo</strong>).
                    Antes de confirmar podrás revisar los cambios.
                  </p>

                  <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-azul hover:bg-blue-50/30 transition-colors">
                    <Upload size={32} className="text-slate-400" />
                    <span className="text-sm text-slate-500">
                      {importando ? 'Procesando…' : 'Hacer clic para seleccionar el archivo Excel'}
                    </span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleArchivoSeleccionado}
                      disabled={importando}
                    />
                  </label>

                  {importError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                      {importError}
                    </div>
                  )}
                </>
              )}

              {/* Previsualización comparativa */}
              {!importOk && preview && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      Previsualización — {preview.filas.length} fila(s)
                    </p>
                    <div className="flex gap-3 text-xs">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" /> Nueva</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-100 border border-yellow-300 inline-block" /> Con diferencias</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Nombre (importar)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Vig. Desde (imp.)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Vig. Hasta (imp.)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium border-l border-slate-200">Nombre (actual)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Vig. Desde (actual)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Vig. Hasta (actual)</th>
                          <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preview.filas.map((fila, i) => (
                          <PreviewRow key={i} fila={fila} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {importError && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                      {importError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setPreview(null); setImportError(null) }}
                      className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleConfirmarImport}
                      disabled={importando}
                      className="flex-1 px-4 py-2 bg-azul text-white rounded-lg text-sm font-medium hover:bg-azul/90 disabled:opacity-60"
                    >
                      {importando ? 'Confirmando…' : '✓ Confirmar importación'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────

function ChipEstado({ estado }: { estado: EstadoUnidadArancel }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
      estado === 'Vigente'
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-600'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${estado === 'Vigente' ? 'bg-green-500' : 'bg-red-500'}`} />
      {estado}
    </span>
  )
}

function ChipAccion({ accion }: { accion: string }) {
  const COLOR: Record<string, string> = {
    ALTA:            'bg-green-100 text-green-700',
    MODIFICACION:    'bg-blue-100 text-blue-700',
    BAJA_LOGICA:     'bg-red-100 text-red-600',
    CAMBIO_VIGENCIA: 'bg-yellow-100 text-yellow-700',
    CAMBIO_ESTADO:   'bg-orange-100 text-orange-700',
    IMPORTACION:     'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${COLOR[accion] ?? 'bg-slate-100 text-slate-600'}`}>
      {LABEL_ACCION[accion] ?? accion}
    </span>
  )
}

function CambiosResumen({ log }: { log: UnidadArancelAuditLog }) {
  const partes: string[] = []
  if (log.nombreAnterior && log.nombreNuevo && log.nombreAnterior !== log.nombreNuevo)
    partes.push(`Nombre: "${log.nombreAnterior}" → "${log.nombreNuevo}"`)
  if (log.vigenciaDesdeAnterior && log.vigenciaDesdeNuevo && log.vigenciaDesdeAnterior !== log.vigenciaDesdeNuevo)
    partes.push(`Desde: ${log.vigenciaDesdeAnterior} → ${log.vigenciaDesdeNuevo}`)
  if (log.vigenciaHastaAnterior && log.vigenciaHastaNuevo && log.vigenciaHastaAnterior !== log.vigenciaHastaNuevo)
    partes.push(`Hasta: ${log.vigenciaHastaAnterior} → ${log.vigenciaHastaNuevo}`)
  if (log.activoAnterior !== undefined && log.activoNuevo !== undefined && log.activoAnterior !== log.activoNuevo)
    partes.push(`Estado: ${log.activoAnterior ? 'Vigente' : 'Inactivo'} → ${log.activoNuevo ? 'Vigente' : 'Inactivo'}`)

  if (log.accion === 'ALTA')
    return <span className="text-green-600">Creación inicial: {log.nombreNuevo}</span>

  if (partes.length === 0)
    return <span className="text-slate-400 italic">Sin cambios registrados</span>

  return (
    <ul className="space-y-0.5">
      {partes.map((p, i) => <li key={i} className="text-slate-600">{p}</li>)}
    </ul>
  )
}

function PreviewRow({ fila }: { fila: UnidadArancelImportPreviewRow }) {
  const hayDif = fila.hayDiferenciaNombre || fila.hayDiferenciaVigencia
  const rowClass = fila.esNueva
    ? 'bg-green-50'
    : hayDif ? 'bg-yellow-50' : ''

  return (
    <tr className={rowClass}>
      <td className={`px-3 py-2 font-medium ${fila.hayDiferenciaNombre ? 'text-yellow-800' : 'text-slate-800'}`}>
        {fila.nombreImport}
      </td>
      <td className={`px-3 py-2 ${fila.hayDiferenciaVigencia ? 'text-yellow-800' : 'text-slate-600'}`}>
        {fila.vigenciaDesdeImport}
      </td>
      <td className={`px-3 py-2 ${fila.hayDiferenciaVigencia ? 'text-yellow-800' : 'text-slate-600'}`}>
        {fila.vigenciaHastaImport}
      </td>
      <td className="px-3 py-2 text-slate-500 border-l border-slate-200">
        {fila.esNueva ? <span className="italic text-green-600">Nueva</span> : fila.nombreActual}
      </td>
      <td className="px-3 py-2 text-slate-500">{fila.vigenciaDesdeActual ?? '—'}</td>
      <td className="px-3 py-2 text-slate-500">{fila.vigenciaHastaActual ?? '—'}</td>
      <td className="px-3 py-2">
        {fila.esNueva ? (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Nueva</span>
        ) : hayDif ? (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Diferente</span>
        ) : (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">Sin cambios</span>
        )}
      </td>
    </tr>
  )
}
