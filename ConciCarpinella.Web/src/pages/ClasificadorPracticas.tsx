// ============================================================
// PÁGINA: Clasificador de Prácticas
// Módulo de gestión de clasificadores jerárquicos (3 niveles).
// Solapas: 1. Maestro  |  2. Auditoría
// ============================================================

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clasificadorPracticasService } from '../services/clasificadorPracticasService'
import type {
  ClasificadorPracticaList,
  CrearEditarClasificadorPractica,
  ClasificadorPracticaAuditLog,
  EstadoClasificador,
  ClasificadorPracticaImportPreview,
  ClasificadorPracticaImportPreviewRow,
} from '../types'
import {
  Plus, Pencil, Search, X, Download, Upload,
  History, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, GitBranch,
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────
const ESTADOS: EstadoClasificador[] = ['Activo', 'Inactivo']

const ACCIONES_AUDITORIA = ['ALTA', 'MODIFICACION', 'CAMBIO_ESTADO', 'IMPORTACION']

const LABEL_ACCION: Record<string, string> = {
  ALTA:          'Alta',
  MODIFICACION:  'Modificación',
  CAMBIO_ESTADO: 'Cambio estado',
  IMPORTACION:   'Importación',
}

const FORM_INICIAL: CrearEditarClasificadorPractica = {
  nivel1: '', nivel2: '', nivel3: '',
}

// ── Helpers ──────────────────────────────────────────────────
const fmtFechaHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '—'

// ── Componente principal ─────────────────────────────────────
export default function ClasificadorPracticasPage() {
  const qc = useQueryClient()

  // ── Solapas ──────────────────────────────────────────────────
  const [solapa, setSolapa] = useState<'maestro' | 'auditoria'>('maestro')

  // ── Filtros Maestro ──────────────────────────────────────────
  const [filtroNivel1, setFiltroNivel1] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')

  // ── Modal Alta/Edición ───────────────────────────────────────
  const [modalForm, setModalForm]   = useState(false)
  const [editando, setEditando]     = useState<ClasificadorPracticaList | null>(null)
  const [form, setForm]             = useState<CrearEditarClasificadorPractica>(FORM_INICIAL)
  const [errorForm, setErrorForm]   = useState<string | null>(null)

  // ── Modal Historial (per-row) ────────────────────────────────
  const [modalHistorial, setModalHistorial] = useState(false)
  const [historialItem, setHistorialItem]   = useState<ClasificadorPracticaList | null>(null)

  // ── Modal Importación ────────────────────────────────────────
  const [modalImport, setModalImport]   = useState(false)
  const [preview, setPreview]           = useState<ClasificadorPracticaImportPreview | null>(null)
  const [importError, setImportError]   = useState<string | null>(null)
  const [importando, setImportando]     = useState(false)
  const [importOk, setImportOk]         = useState<{ creadas: number; actualizadas: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Filtros Auditoría ────────────────────────────────────────
  const [audUsuario, setAudUsuario] = useState('')
  const [audAccion, setAudAccion]   = useState('')
  const [audDesde, setAudDesde]     = useState('')
  const [audHasta, setAudHasta]     = useState('')

  // ── Queries ──────────────────────────────────────────────────
  const { data: clasificadores = [], isLoading } = useQuery({
    queryKey: ['clasificador-practicas', filtroNivel1, filtroEstado, filtroBuscar],
    queryFn:  () => clasificadorPracticasService.listar({
      ...(filtroNivel1 ? { nivel1: filtroNivel1 } : {}),
      ...(filtroEstado ? { estado: filtroEstado } : {}),
      ...(filtroBuscar ? { buscar: filtroBuscar } : {}),
    }),
  })

  // Valores únicos de Nivel1 para el desplegable (dinámico desde BD)
  const nivel1Unicos = useQuery({
    queryKey: ['clasificador-practicas-nivel1'],
    queryFn:  () => clasificadorPracticasService.listar(),
    select:   (data) => [...new Set(data.map(c => c.nivel1))].sort(),
  })

  const { data: historialLogs = [], isLoading: cargandoHistorial } = useQuery({
    queryKey: ['clasificador-auditoria-id', historialItem?.id],
    queryFn:  () => clasificadorPracticasService.auditoriaPorId(historialItem!.id),
    enabled:  !!historialItem,
  })

  const { data: auditoriaGlobal = [], isLoading: cargandoAuditoria } = useQuery({
    queryKey: ['clasificador-auditoria-global', audUsuario, audAccion, audDesde, audHasta],
    queryFn:  () => clasificadorPracticasService.auditoriaGlobal({
      ...(audUsuario ? { usuarioNombre: audUsuario } : {}),
      ...(audAccion  ? { accion: audAccion }         : {}),
      ...(audDesde   ? { fechaDesde: audDesde }       : {}),
      ...(audHasta   ? { fechaHasta: audHasta }       : {}),
    }),
    enabled: solapa === 'auditoria',
  })

  // ── Mutations ────────────────────────────────────────────────
  const mutCrear = useMutation({
    mutationFn: (dto: CrearEditarClasificadorPractica) =>
      clasificadorPracticasService.crear(dto),
    onSuccess: () => {
      invalidar()
      cerrarModal()
    },
    onError: (e: any) => setErrorForm(e.response?.data?.mensaje ?? 'Error al crear.'),
  })

  const mutActualizar = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: CrearEditarClasificadorPractica }) =>
      clasificadorPracticasService.actualizar(id, dto),
    onSuccess: () => {
      invalidar()
      cerrarModal()
    },
    onError: (e: any) => setErrorForm(e.response?.data?.mensaje ?? 'Error al actualizar.'),
  })

  const mutEstado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      clasificadorPracticasService.actualizarEstado(id, activo),
    onSuccess: () => invalidar(),
  })

  // ── Helpers UI ────────────────────────────────────────────────
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['clasificador-practicas'] })
    qc.invalidateQueries({ queryKey: ['clasificador-practicas-nivel1'] })
    qc.invalidateQueries({ queryKey: ['clasificador-auditoria-global'] })
  }

  const abrirCrear = () => {
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
    setModalForm(true)
  }

  const abrirEditar = (c: ClasificadorPracticaList) => {
    setEditando(c)
    setForm({ nivel1: c.nivel1, nivel2: c.nivel2, nivel3: c.nivel3 })
    setErrorForm(null)
    setModalForm(true)
  }

  const cerrarModal = () => {
    setModalForm(false)
    setEditando(null)
    setForm(FORM_INICIAL)
    setErrorForm(null)
  }

  const guardarForm = () => {
    if (!form.nivel1.trim() || !form.nivel2.trim() || !form.nivel3.trim()) {
      setErrorForm('Los tres niveles son obligatorios.')
      return
    }
    if (editando) {
      mutActualizar.mutate({ id: editando.id, dto: form })
    } else {
      mutCrear.mutate(form)
    }
  }

  // ── Exportar ─────────────────────────────────────────────────
  const exportar = async () => {
    const blob = await clasificadorPracticasService.exportar()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `clasificador-practicas-${new Date().toISOString().slice(0, 10)}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Importación ───────────────────────────────────────────────
  const abrirImport = () => {
    setPreview(null)
    setImportError(null)
    setImportando(false)
    setImportOk(null)
    setModalImport(true)
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setImportError(null)
    setImportando(true)
    try {
      const prev = await clasificadorPracticasService.importarPreview(archivo)
      setPreview(prev)
    } catch (err: any) {
      // El interceptor de api.ts convierte el error en new Error(mensaje),
      // por eso usamos err.message en lugar de err.response?.data?.mensaje
      setImportError(err.message ?? 'Error al procesar el archivo.')
    } finally {
      setImportando(false)
    }
  }

  const confirmarImport = async () => {
    if (!preview) return
    setImportando(true)
    try {
      const res = await clasificadorPracticasService.importarConfirmar({
        transactionId: preview.transactionId,
        filas: preview.filas.map(f => ({
          id:      f.idExistente ?? undefined,
          nivel1:  f.nivel1Import,
          nivel2:  f.nivel2Import,
          nivel3:  f.nivel3Import,
          activo:  f.activoImport,
        })),
      })
      setImportOk({ creadas: res.creadas, actualizadas: res.actualizadas })
      invalidar()
    } catch (err: any) {
      setImportError(err.message ?? 'Error al confirmar la importación.')
    } finally {
      setImportando(false)
    }
  }

  const cerrarImport = () => {
    setModalImport(false)
    setPreview(null)
    setImportError(null)
    setImportando(false)
    setImportOk(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-full">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-7 h-7 text-blue-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Clasificador de Prácticas</h1>
            <p className="text-sm text-gray-500">Gestión jerárquica de clasificadores (3 niveles)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportar}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button
            onClick={abrirImport}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Solapas */}
      <div className="flex border-b border-gray-200 mb-6">
        {(['maestro', 'auditoria'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSolapa(s)}
            className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
              solapa === s
                ? 'border-blue-700 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'maestro' ? 'Maestro' : 'Auditoría'}
          </button>
        ))}
      </div>

      {/* ── SOLAPA MAESTRO ──────────────────────────────────────── */}
      {solapa === 'maestro' && (
        <>
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 mb-4">
            {/* Nivel 1 desplegable dinámico */}
            <select
              value={filtroNivel1}
              onChange={e => setFiltroNivel1(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">Todos los Nivel 1</option>
              {(nivel1Unicos.data ?? []).map(n1 => (
                <option key={n1} value={n1}>{n1}</option>
              ))}
            </select>

            {/* Estado */}
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>

            {/* Búsqueda libre (Nivel2/Nivel3) */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar en Nivel 2 / Nivel 3…"
                value={filtroBuscar}
                onChange={e => setFiltroBuscar(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64"
              />
              {filtroBuscar && (
                <button
                  onClick={() => setFiltroBuscar('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Contador */}
            <span className="self-center text-sm text-gray-500 ml-auto">
              {clasificadores.length} resultado{clasificadores.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Nivel 1</th>
                    <th className="px-4 py-3 text-left font-semibold">Nivel 2</th>
                    <th className="px-4 py-3 text-left font-semibold">Nivel 3</th>
                    <th className="px-4 py-3 text-center font-semibold">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        Cargando…
                      </td>
                    </tr>
                  ) : clasificadores.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No hay clasificadores que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    clasificadores.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 text-xs">{c.id}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{c.nivel1}</td>
                        <td className="px-4 py-3 text-gray-700">{c.nivel2}</td>
                        <td className="px-4 py-3 text-gray-600">{c.nivel3}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => mutEstado.mutate({ id: c.id, activo: !c.activo })}
                            title={c.activo ? 'Inactivar' : 'Activar'}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              c.activo
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                          >
                            {c.activo
                              ? <><CheckCircle2 className="w-3 h-3" /> Activo</>
                              : <><XCircle className="w-3 h-3" /> Inactivo</>
                            }
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => abrirEditar(c)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setHistorialItem(c); setModalHistorial(true) }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                              title="Ver historial"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SOLAPA AUDITORÍA ─────────────────────────────────────── */}
      {solapa === 'auditoria' && (
        <>
          {/* Filtros auditoría */}
          <div className="flex flex-wrap gap-3 mb-4">
            <input
              type="text"
              placeholder="Buscar usuario…"
              value={audUsuario}
              onChange={e => setAudUsuario(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-44"
            />
            <select
              value={audAccion}
              onChange={e => setAudAccion(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todas las acciones</option>
              {ACCIONES_AUDITORIA.map(a => (
                <option key={a} value={a}>{LABEL_ACCION[a]}</option>
              ))}
            </select>
            <input
              type="date"
              value={audDesde}
              onChange={e => setAudDesde(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Desde"
            />
            <input
              type="date"
              value={audHasta}
              onChange={e => setAudHasta(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Hasta"
            />
            <button
              onClick={() => { setAudUsuario(''); setAudAccion(''); setAudDesde(''); setAudHasta('') }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                    <th className="px-4 py-3 text-left font-semibold">Acción</th>
                    <th className="px-4 py-3 text-left font-semibold">Clasificador (N1/N2/N3)</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold">Origen</th>
                    <th className="px-4 py-3 text-left font-semibold">Anterior → Nuevo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cargandoAuditoria ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                        Cargando auditoría…
                      </td>
                    </tr>
                  ) : auditoriaGlobal.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        No hay registros de auditoría.
                      </td>
                    </tr>
                  ) : (
                    auditoriaGlobal.map((log: ClasificadorPracticaAuditLog) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {fmtFechaHora(log.fechaEvento)}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeAccion(log.accion)}`}>
                            {LABEL_ACCION[log.accion] ?? log.accion}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-700">
                          <span className="font-medium">{log.nivel1Clasificador}</span>
                          {log.nivel2Clasificador && <> / {log.nivel2Clasificador}</>}
                          {log.nivel3Clasificador && <> / {log.nivel3Clasificador}</>}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">{log.usuarioNombre || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            log.origen === 'IMPORTACION'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {log.origen}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {log.accion === 'CAMBIO_ESTADO' && (
                            <span>
                              {log.activoAnterior ? 'Activo' : 'Inactivo'}
                              {' → '}
                              {log.activoNuevo ? 'Activo' : 'Inactivo'}
                            </span>
                          )}
                          {log.accion === 'MODIFICACION' && (
                            <span className="text-gray-400 italic">Niveles actualizados</span>
                          )}
                          {log.accion === 'ALTA' && (
                            <span className="text-green-600">Nuevo registro</span>
                          )}
                          {log.accion === 'IMPORTACION' && (
                            <span className="text-purple-600">Importado</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── MODAL CREAR / EDITAR ─────────────────────────────────── */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">
                {editando ? 'Editar Clasificador' : 'Nuevo Clasificador'}
              </h2>
              <button onClick={cerrarModal}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <div className="p-6 space-y-4">
              {errorForm && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {errorForm}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nivel 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel1}
                  onChange={e => setForm(f => ({ ...f, nivel1: e.target.value }))}
                  maxLength={150}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: DIAGNÓSTICO POR IMÁGENES"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nivel 2 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel2}
                  onChange={e => setForm(f => ({ ...f, nivel2: e.target.value }))}
                  maxLength={150}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: TOMOGRAFÍA"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nivel 3 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel3}
                  onChange={e => setForm(f => ({ ...f, nivel3: e.target.value }))}
                  maxLength={150}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: SIMPLE"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={guardarForm}
                disabled={mutCrear.isPending || mutActualizar.isPending}
                className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-60"
              >
                {(mutCrear.isPending || mutActualizar.isPending) ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL ──────────────────────────────────────── */}
      {modalHistorial && historialItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-semibold text-gray-800">Historial de cambios</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {historialItem.nivel1} / {historialItem.nivel2} / {historialItem.nivel3}
                </p>
              </div>
              <button onClick={() => setModalHistorial(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {cargandoHistorial ? (
                <div className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                  Cargando…
                </div>
              ) : historialLogs.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sin historial.</p>
              ) : (
                <div className="space-y-3">
                  {historialLogs.map((log: ClasificadorPracticaAuditLog) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className="pt-0.5">
                        <span className={`inline-block w-2 h-2 rounded-full mt-1.5 ${dotAccion(log.accion)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${badgeAccion(log.accion)}`}>
                            {LABEL_ACCION[log.accion] ?? log.accion}
                          </span>
                          <span className="text-xs text-gray-400">{fmtFechaHora(log.fechaEvento)}</span>
                          {log.usuarioNombre && (
                            <span className="text-xs text-gray-500">por {log.usuarioNombre}</span>
                          )}
                        </div>
                        {log.accion === 'CAMBIO_ESTADO' && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {log.activoAnterior ? 'Activo' : 'Inactivo'} → {log.activoNuevo ? 'Activo' : 'Inactivo'}
                          </p>
                        )}
                        {log.accion === 'MODIFICACION' && (
                          <p className="text-xs text-gray-500 mt-0.5">Niveles actualizados</p>
                        )}
                        {log.transactionId && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
                            Tx: {log.transactionId}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTACIÓN ────────────────────────────────────── */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Importar desde Excel</h2>
              <button onClick={cerrarImport}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {/* Resultado OK */}
              {importOk ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-gray-800 text-lg">¡Importación exitosa!</p>
                  <p className="text-gray-500 mt-1">
                    Creados: <strong>{importOk.creadas}</strong> &nbsp;|&nbsp;
                    Actualizados: <strong>{importOk.actualizadas}</strong>
                  </p>
                  <button
                    onClick={cerrarImport}
                    className="mt-4 px-4 py-2 bg-blue-700 text-white text-sm rounded-lg hover:bg-blue-800"
                  >
                    Cerrar
                  </button>
                </div>
              ) : !preview ? (
                /* Paso 1: seleccionar archivo */
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seleccioná un archivo Excel con las columnas: <strong>Nivel1</strong>, <strong>Nivel2</strong>, <strong>Nivel3</strong> (a partir de la fila 2).
                  </p>
                  {importError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-3">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {importError}
                    </div>
                  )}
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Hacer clic para seleccionar archivo (.xlsx)</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      ref={fileRef}
                      onChange={onFileChange}
                    />
                  </label>
                  {importando && (
                    <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Procesando archivo…
                    </div>
                  )}
                </div>
              ) : (
                /* Paso 2: preview */
                <div>
                  <div className="flex items-center gap-3 mb-4 text-sm">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                      {preview.filas.filter(f => f.esNueva).length} nuevas
                    </span>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                      {preview.filas.filter(f => !f.esNueva).length} existentes
                    </span>
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-3">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {importError}
                    </div>
                  )}

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600">Acción</th>
                          <th className="px-3 py-2 text-center text-gray-600">ID actual</th>
                          <th className="px-3 py-2 text-left text-gray-600">Nivel 1</th>
                          <th className="px-3 py-2 text-left text-gray-600">Nivel 2</th>
                          <th className="px-3 py-2 text-left text-gray-600">Nivel 3</th>
                          <th className="px-3 py-2 text-center text-gray-600">Estado actual</th>
                          <th className="px-3 py-2 text-center text-gray-600">Estado a importar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {preview.filas.map((f: ClasificadorPracticaImportPreviewRow, i) => (
                          <tr key={i} className={
                            f.esNueva ? 'bg-green-50' :
                            f.hayDiferencia ? 'bg-yellow-50' : 'bg-white'
                          }>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                f.esNueva
                                  ? 'bg-green-100 text-green-700'
                                  : f.hayDiferencia
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}>
                                {f.esNueva ? 'NUEVA' : f.hayDiferencia ? 'MODIFICA' : 'SIN CAMBIOS'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-gray-500">
                              {f.idExistente ?? '—'}
                            </td>
                            <td className="px-3 py-2 font-medium">{f.nivel1Import}</td>
                            <td className="px-3 py-2">{f.nivel2Import}</td>
                            <td className="px-3 py-2">{f.nivel3Import}</td>
                            <td className="px-3 py-2 text-center">
                              {f.esNueva ? '—' : (
                                <span className={f.activoActual ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                  {f.activoActual ? 'Activo' : 'Inactivo'}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={f.activoImport ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                                {f.activoImport ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del modal */}
            {preview && !importOk && (
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = '' }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cambiar archivo
                </button>
                <button
                  onClick={confirmarImport}
                  disabled={importando}
                  className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 disabled:opacity-60"
                >
                  {importando ? 'Importando…' : `Confirmar importación (${preview.filas.length} filas)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers de estilos ────────────────────────────────────────
function badgeAccion(accion: string): string {
  switch (accion) {
    case 'ALTA':          return 'bg-green-100 text-green-700'
    case 'MODIFICACION':  return 'bg-yellow-100 text-yellow-700'
    case 'CAMBIO_ESTADO': return 'bg-blue-100 text-blue-700'
    case 'IMPORTACION':   return 'bg-purple-100 text-purple-700'
    default:              return 'bg-gray-100 text-gray-600'
  }
}

function dotAccion(accion: string): string {
  switch (accion) {
    case 'ALTA':          return 'bg-green-500'
    case 'MODIFICACION':  return 'bg-yellow-500'
    case 'CAMBIO_ESTADO': return 'bg-blue-500'
    case 'IMPORTACION':   return 'bg-purple-500'
    default:              return 'bg-gray-400'
  }
}
