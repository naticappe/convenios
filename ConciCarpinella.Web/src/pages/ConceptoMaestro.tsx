// ============================================================
// PÁGINA: Concepto
// Módulo de gestión de conceptos asociados a prácticas médicas.
// Solapas: 1. Maestro  |  2. Auditoría
// ============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conceptoMaestroService } from '../services/conceptoMaestroService'
import type {
  ConceptoMaestroList, CrearEditarConceptoMaestro,
  ConceptoMaestroAuditLog, EstadoConceptoMaestro,
  ConceptoMaestroImportPreview, ConceptoMaestroImportPreviewRow
} from '../types'
import {
  Plus, Pencil, Search, X, Download, Upload,
  History, CheckCircle2, XCircle, Clock, DollarSign,
  RefreshCw, AlertTriangle
} from 'lucide-react'

const ESTADOS: EstadoConceptoMaestro[] = ['Vigente', 'Inactivo']

const ACCIONES_AUDITORIA = ['ALTA', 'MODIFICACION', 'BAJA_LOGICA', 'CAMBIO_VIGENCIA', 'IMPORTACION']

const LABEL_ACCION: Record<string, string> = {
  ALTA:            'Alta',
  MODIFICACION:    'Modificación',
  BAJA_LOGICA:     'Baja lógica',
  CAMBIO_VIGENCIA: 'Cambio vigencia',
  IMPORTACION:     'Importación',
}

const HOY = new Date().toISOString().slice(0, 10)

const FORM_INICIAL: CrearEditarConceptoMaestro = {
  nombre: '', sigla: '', vigenciaDesde: HOY, vigenciaHasta: '9999-12-31',
}

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

export default function ConceptoMaestroPage() {
  const qc = useQueryClient()

  const [solapa, setSolapa] = useState<'maestro' | 'auditoria'>('maestro')

  // Filtros Maestro
  const [filtroBuscar, setFiltroBuscar] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Modal Alta/Edición
  const [modalForm, setModalForm]   = useState(false)
  const [editando, setEditando]     = useState<ConceptoMaestroList | null>(null)
  const [form, setForm]             = useState<CrearEditarConceptoMaestro>(FORM_INICIAL)
  const [errorForm, setErrorForm]   = useState<string | null>(null)

  // Modal Historial
  const [modalHistorial, setModalHistorial] = useState(false)
  const [historialItem, setHistorialItem]   = useState<ConceptoMaestroList | null>(null)

  // Modal Importación
  const [modalImport, setModalImport]   = useState(false)
  const [preview, setPreview]           = useState<ConceptoMaestroImportPreview | null>(null)
  const [importError, setImportError]   = useState<string | null>(null)
  const [importando, setImportando]     = useState(false)
  const [importOk, setImportOk]         = useState<{ creados: number; actualizados: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Filtros Auditoría
  const [audUsuario, setAudUsuario] = useState('')
  const [audAccion, setAudAccion]   = useState('')
  const [audDesde, setAudDesde]     = useState('')
  const [audHasta, setAudHasta]     = useState('')

  // ── Queries ──────────────────────────────────────────────────
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['conceptos-maestro', filtroBuscar, filtroEstado],
    queryFn:  () => conceptoMaestroService.listar({
      ...(filtroBuscar ? { buscar: filtroBuscar } : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
    }),
  })

  const { data: historialData = [], isLoading: loadingHistorial } = useQuery({
    queryKey: ['concepto-historial', historialItem?.id],
    queryFn:  () => conceptoMaestroService.auditoriaPorId(historialItem!.id),
    enabled:  !!historialItem,
  })

  const { data: auditoriaData = [], isLoading: loadingAuditoria } = useQuery({
    queryKey: ['concepto-auditoria', audUsuario, audAccion, audDesde, audHasta],
    queryFn:  () => conceptoMaestroService.auditoriaGlobal({
      ...(audUsuario ? { usuarioNombre: audUsuario } : {}),
      ...(audAccion  ? { accion: audAccion }         : {}),
      ...(audDesde   ? { fechaDesde: audDesde }      : {}),
      ...(audHasta   ? { fechaHasta: audHasta }      : {}),
    }),
    enabled: solapa === 'auditoria',
  })

  // ── Mutaciones ───────────────────────────────────────────────
  const guardar = useMutation({
    mutationFn: (datos: CrearEditarConceptoMaestro) =>
      editando
        ? conceptoMaestroService.actualizar(editando.id, datos)
        : conceptoMaestroService.crear(datos),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conceptos-maestro'] }); cerrarModal() },
    onError:   (err: Error) => setErrorForm(err.message),
  })

  const toggleEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      conceptoMaestroService.actualizarEstado(id, { activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conceptos-maestro'] }),
  })

  // ── Handlers ─────────────────────────────────────────────────
  function abrirCrear() {
    setEditando(null); setForm(FORM_INICIAL); setErrorForm(null); setModalForm(true)
  }

  function abrirEditar(item: ConceptoMaestroList) {
    setEditando(item)
    setForm({ nombre: item.nombre, sigla: item.sigla, vigenciaDesde: item.vigenciaDesde, vigenciaHasta: item.vigenciaHasta })
    setErrorForm(null); setModalForm(true)
  }

  function cerrarModal() {
    setModalForm(false); setEditando(null); setForm(FORM_INICIAL); setErrorForm(null)
  }

  function abrirHistorial(item: ConceptoMaestroList) {
    setHistorialItem(item); setModalHistorial(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim())  { setErrorForm('El nombre es obligatorio.'); return }
    if (!form.sigla.trim())   { setErrorForm('La sigla es obligatoria.'); return }
    if (form.sigla.length > 10) { setErrorForm('La sigla no puede superar 10 caracteres.'); return }
    if (!form.vigenciaDesde)  { setErrorForm('Vigencia desde es obligatoria.'); return }
    if (!form.vigenciaHasta)  { setErrorForm('Vigencia hasta es obligatoria.'); return }
    if (form.vigenciaHasta < form.vigenciaDesde) { setErrorForm('Vigencia hasta debe ser ≥ vigencia desde.'); return }
    setErrorForm(null)
    guardar.mutate(form)
  }

  async function handleExportar() {
    try {
      const blob = await conceptoMaestroService.exportar()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `conceptos-${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silencio */ }
  }

  async function handleArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setImportError(null); setPreview(null); setImportOk(null)
    try {
      const data = await conceptoMaestroService.importarPreview(archivo)
      setPreview(data)
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar el archivo.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleConfirmarImport() {
    if (!preview) return
    setImportando(true); setImportError(null)
    try {
      const res = await conceptoMaestroService.importarConfirmar({
        transactionId: preview.transactionId,
        filas: preview.filas.map(f => ({
          nombre: f.nombreImport,
          sigla:  f.siglaImport,
          vigenciaDesde: f.vigenciaDesdeImport,
          vigenciaHasta: f.vigenciaHastaImport,
        })),
      })
      setImportOk({ creados: res.creados, actualizados: res.actualizados })
      setPreview(null)
      qc.invalidateQueries({ queryKey: ['conceptos-maestro'] })
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Error al confirmar importación.')
    } finally {
      setImportando(false)
    }
  }

  function abrirImport() {
    setModalImport(true); setPreview(null); setImportError(null); setImportOk(null)
  }
  function cerrarImport() {
    setModalImport(false); setPreview(null); setImportError(null); setImportOk(null)
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign size={22} className="text-azul" />
            Conceptos
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestión de conceptos asociados a prácticas médicas</p>
        </div>
      </div>

      {/* Solapas */}
      <div className="flex border-b border-slate-200 mb-6">
        {(['maestro', 'auditoria'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSolapa(s)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              solapa === s
                ? 'border-azul text-azul'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s === 'maestro' ? 'Maestro' : 'Auditoría'}
          </button>
        ))}
      </div>

      {/* ── SOLAPA MAESTRO ─────────────────────────────────────── */}
      {solapa === 'maestro' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                placeholder="Buscar por nombre o sigla..."
                value={filtroBuscar}
                onChange={e => setFiltroBuscar(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button
              onClick={handleExportar}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              <Download size={15} />Exportar
            </button>
            <button
              onClick={abrirImport}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              <Upload size={15} />Importar
            </button>
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 bg-azul hover:bg-azul-oscuro text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm"
            >
              <Plus size={16} />Nuevo Concepto
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />Cargando...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
              <p>No se encontraron conceptos.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Sigla</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Vigencia Desde</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Vigencia Hasta</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Estado</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} className={`border-b border-slate-100 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.nombre}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs font-semibold">
                          {item.sigla}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{fmtFecha(item.vigenciaDesde)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.vigenciaHasta === '9999-12-31' ? (
                          <span className="text-slate-400 italic text-xs">Indefinido</span>
                        ) : fmtFecha(item.vigenciaHasta)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleEstado.mutate({ id: item.id, activo: !item.activo })}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            item.activo
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {item.activo ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {item.estado}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => abrirHistorial(item)}
                            title="Ver historial"
                            className="p-1.5 text-slate-400 hover:text-azul hover:bg-azul/10 rounded-lg transition-colors"
                          >
                            <History size={15} />
                          </button>
                          <button
                            onClick={() => abrirEditar(item)}
                            title="Editar"
                            className="p-1.5 text-slate-400 hover:text-azul hover:bg-azul/10 rounded-lg transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SOLAPA AUDITORÍA ───────────────────────────────────── */}
      {solapa === 'auditoria' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <input
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
              placeholder="Filtrar por usuario..."
              value={audUsuario}
              onChange={e => setAudUsuario(e.target.value)}
            />
            <select
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
              value={audAccion}
              onChange={e => setAudAccion(e.target.value)}
            >
              <option value="">Todas las acciones</option>
              {ACCIONES_AUDITORIA.map(a => (
                <option key={a} value={a}>{LABEL_ACCION[a] ?? a}</option>
              ))}
            </select>
            <input type="date" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
              value={audDesde} onChange={e => setAudDesde(e.target.value)} />
            <input type="date" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
              value={audHasta} onChange={e => setAudHasta(e.target.value)} />
            <button
              onClick={() => { setAudUsuario(''); setAudAccion(''); setAudDesde(''); setAudHasta('') }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"
            >
              <X size={14} />Limpiar
            </button>
          </div>

          {loadingAuditoria ? (
            <div className="flex justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />Cargando...
            </div>
          ) : auditoriaData.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              <p>No hay registros de auditoría para los filtros seleccionados.</p>
            </div>
          ) : (
            <AuditTable logs={auditoriaData} />
          )}
        </div>
      )}

      {/* ── MODAL Alta/Edición ────────────────────────────────── */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editando ? 'Editar Concepto' : 'Nuevo Concepto'}
              </h2>
              <button onClick={cerrarModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Ej: Consulta Médica General"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sigla * <span className="text-slate-400">(máx. 10 caracteres)</span></label>
                <input
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30 uppercase"
                  placeholder="Ej: CMG"
                  maxLength={10}
                  value={form.sigla}
                  onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vigencia Desde *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                    value={form.vigenciaDesde}
                    onChange={e => setForm(f => ({ ...f, vigenciaDesde: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vigencia Hasta *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                    value={form.vigenciaHasta === '9999-12-31' ? '' : form.vigenciaHasta}
                    onChange={e => setForm(f => ({ ...f, vigenciaHasta: e.target.value || '9999-12-31' }))}
                  />
                  <p className="text-xs text-slate-400 mt-1">Dejar vacío = vigente indefinidamente</p>
                </div>
              </div>
              {errorForm && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} />{errorForm}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={cerrarModal}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={guardar.isPending}
                  className="px-5 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg font-medium disabled:opacity-60">
                  {guardar.isPending ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear concepto')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL Historial ──────────────────────────────────── */}
      {modalHistorial && historialItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                Historial — <span className="text-azul">{historialItem.nombre}</span>
                <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">{historialItem.sigla}</span>
              </h2>
              <button onClick={() => setModalHistorial(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {loadingHistorial ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" />Cargando...
                </div>
              ) : (
                <AuditTable logs={historialData} compact />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL Importación ─────────────────────────────────── */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Importar Conceptos</h2>
              <button onClick={cerrarImport}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto flex-1 px-6 py-5">
              {importOk ? (
                <div className="text-center py-10">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" />
                  <p className="text-lg font-semibold text-slate-800 mb-1">Importación completada</p>
                  <p className="text-slate-500 text-sm">
                    Creados: <strong>{importOk.creados}</strong> · Actualizados: <strong>{importOk.actualizados}</strong>
                  </p>
                  <button onClick={cerrarImport}
                    className="mt-5 px-5 py-2 bg-azul text-white text-sm rounded-lg font-medium">
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-3">
                      El Excel debe tener: <strong>B = Nombre</strong>, <strong>C = Sigla</strong>, <strong>D = Vigencia Desde</strong> (yyyy-MM-dd), <strong>E = Vigencia Hasta</strong>.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer px-4 py-2 border-2 border-dashed border-azul/40 rounded-xl hover:border-azul/70 text-azul text-sm font-medium w-fit">
                      <Upload size={16} />Seleccionar archivo Excel (.xlsx)
                      <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
                        onChange={handleArchivoSeleccionado} />
                    </label>
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">
                      <AlertTriangle size={15} />{importError}
                    </div>
                  )}

                  {preview && (
                    <>
                      <div className="mb-3 text-sm text-slate-600">
                        <strong>{preview.filas.length}</strong> filas encontradas.
                        {' '}<span className="text-green-600">{preview.filas.filter(f => f.esNuevo).length} nuevos</span>
                        {' · '}<span className="text-amber-600">{preview.filas.filter(f => !f.esNuevo && (f.hayDiferenciaNombre || f.hayDiferenciaSigla || f.hayDiferenciaVigencia)).length} con cambios</span>
                        {' · '}<span className="text-slate-400">{preview.filas.filter(f => !f.esNuevo && !f.hayDiferenciaNombre && !f.hayDiferenciaSigla && !f.hayDiferenciaVigencia).length} sin cambios</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Nombre</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Sigla</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">V. Desde</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">V. Hasta</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado actual</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {preview.filas.map((f: ConceptoMaestroImportPreviewRow, i: number) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="px-3 py-2">{f.nombreImport}</td>
                                <td className="px-3 py-2 font-mono font-semibold">{f.siglaImport}</td>
                                <td className="px-3 py-2">{fmtFecha(f.vigenciaDesdeImport)}</td>
                                <td className="px-3 py-2">{fmtFecha(f.vigenciaHastaImport)}</td>
                                <td className="px-3 py-2 text-slate-400">
                                  {f.idExistente ? `${f.nombreActual} / ${f.siglaActual} (${f.activoActual ? 'Vigente' : 'Inactivo'})` : '—'}
                                </td>
                                <td className="px-3 py-2">
                                  {f.esNuevo ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full">NUEVO</span>
                                  ) : f.hayDiferenciaNombre || f.hayDiferenciaSigla || f.hayDiferenciaVigencia ? (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">ACTUALIZA</span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">SIN CAMBIO</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button onClick={() => setPreview(null)}
                          className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                          Cancelar
                        </button>
                        <button onClick={handleConfirmarImport} disabled={importando}
                          className="px-5 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg font-medium disabled:opacity-60">
                          {importando ? 'Importando...' : 'Confirmar importación'}
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: tabla de auditoría ─────────────────────────
function AuditTable({ logs, compact = false }: { logs: ConceptoMaestroAuditLog[]; compact?: boolean }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {!compact && <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Concepto</th>}
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Acción</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Usuario</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Origen</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <>
              <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                {!compact && (
                  <td className="px-3 py-2 font-medium text-slate-700">
                    {log.nombreConcepto}
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    log.accion === 'ALTA'            ? 'bg-green-100 text-green-700'  :
                    log.accion === 'MODIFICACION'    ? 'bg-blue-100 text-blue-700'    :
                    log.accion === 'CAMBIO_VIGENCIA' ? 'bg-amber-100 text-amber-700'  :
                    log.accion === 'IMPORTACION'     ? 'bg-purple-100 text-purple-700':
                    'bg-red-100 text-red-700'
                  }`}>
                    {LABEL_ACCION[log.accion] ?? log.accion}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{fmtFechaHora(log.fechaEvento)}</td>
                <td className="px-3 py-2 text-slate-600">{log.usuarioNombre || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{log.origen}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                    className="text-azul hover:underline flex items-center gap-1"
                  >
                    {expandido === log.id ? 'Ocultar' : 'Ver'} <Clock size={11} />
                  </button>
                </td>
              </tr>
              {expandido === log.id && (
                <tr key={`${log.id}-detail`} className="bg-slate-50 border-b border-slate-100">
                  <td colSpan={compact ? 5 : 6} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Antes</p>
                        <p>Nombre: {log.nombreAnterior ?? '—'}</p>
                        <p>Sigla: {log.siglaAnterior ?? '—'}</p>
                        <p>V. Desde: {fmtFecha(log.vigenciaDesdeAnterior)}</p>
                        <p>V. Hasta: {fmtFecha(log.vigenciaHastaAnterior)}</p>
                        <p>Activo: {log.activoAnterior == null ? '—' : log.activoAnterior ? 'Sí' : 'No'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Después</p>
                        <p>Nombre: {log.nombreNuevo ?? '—'}</p>
                        <p>Sigla: {log.siglaNueva ?? '—'}</p>
                        <p>V. Desde: {fmtFecha(log.vigenciaDesdeNuevo)}</p>
                        <p>V. Hasta: {fmtFecha(log.vigenciaHastaNuevo)}</p>
                        <p>Activo: {log.activoNuevo == null ? '—' : log.activoNuevo ? 'Sí' : 'No'}</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
