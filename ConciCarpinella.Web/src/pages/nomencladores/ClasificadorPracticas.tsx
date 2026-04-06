// ============================================================
// PÁGINA: Clasificador de Prácticas
// Módulo de gestión de clasificadores jerárquicos (3 niveles).
// Solapas: 1. Maestro  |  2. Auditoría
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clasificadorPracticasService } from '../../services/clasificadorPracticasService'
import type {
  ClasificadorPracticaList,
  CrearEditarClasificadorPractica,
  ClasificadorPracticaAuditLog,
  EstadoClasificador,
  ClasificadorPracticaImportPreview,
  ClasificadorPracticaImportPreviewRow,
} from '../../types'
import {
  Plus, Pencil, Search, X, Download, Upload,
  History, CheckCircle2, XCircle, RefreshCw,
  AlertTriangle, GitBranch, ChevronDown, Clock,
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────
const ESTADOS: EstadoClasificador[] = ['Activo', 'Inactivo']

// ══════════════════════════════════════════════════════════════
// COMBOBOX — input con dropdown filtrado por texto
// ══════════════════════════════════════════════════════════════
interface ComboboxOption { id: string; label: string }
interface ComboboxProps {
  options:      ComboboxOption[]
  value:        string
  onChange:     (id: string) => void
  placeholder?: string
  disabled?:    boolean
  className?:   string
}

function Combobox({ options, value, onChange, placeholder, disabled, className = '' }: ComboboxProps) {
  const [inputVal, setInputVal] = useState('')
  const [open,     setOpen]     = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opt = options.find(o => o.id === value)
    setInputVal(opt ? opt.label : '')
  }, [value, options])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        const opt = options.find(o => o.id === value)
        setInputVal(opt ? opt.label : '')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [value, options])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(inputVal.toLowerCase())
  )

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          disabled={disabled}
          onChange={e => { setInputVal(e.target.value); setOpen(true); if (!e.target.value) onChange('') }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-7 text-sm
            focus:outline-none focus:ring-2 focus:ring-azul/30
            disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {value && !disabled ? (
          <button type="button" tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => { onChange(''); setInputVal('') }}>
            <X size={12} />
          </button>
        ) : (
          <ChevronDown size={13}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(opt => (
                <div key={opt.id}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    opt.id === value ? 'bg-azul/10 text-azul font-medium' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  onMouseDown={e => { e.preventDefault(); onChange(opt.id); setInputVal(opt.label); setOpen(false) }}>
                  {opt.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2.5 text-sm text-slate-400 text-center">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  )
}

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
  const [filtroNivel1,   setFiltroNivel1]   = useState('')
  const [filtroNivel23,  setFiltroNivel23]  = useState('')   // id del clasificador (nivel2/3)
  const [filtroEstado,   setFiltroEstado]   = useState('')
  const [filtroBuscar,   setFiltroBuscar]   = useState('')

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

  // Todos los clasificadores sin filtro → para las opciones del Combobox
  const { data: todosParaOpciones = [] } = useQuery({
    queryKey: ['clasificador-practicas-nivel1'],
    queryFn:  () => clasificadorPracticasService.listar(),
  })

  // Valores únicos de Nivel1 ordenados
  const nivel1Unicos = useQuery({
    queryKey: ['clasificador-practicas-nivel1'],
    queryFn:  () => clasificadorPracticasService.listar(),
    select:   (data) => [...new Set(data.map(c => c.nivel1))].sort(),
  })

  // Opciones Combobox Nivel 1
  const nivel1Opts: ComboboxOption[] = (nivel1Unicos.data ?? []).map(n => ({ id: n, label: n }))

  // Opciones Combobox Nivel 2/3 (filtradas por nivel1 si está seleccionado)
  const nivel23Opts: ComboboxOption[] = (
    filtroNivel1
      ? todosParaOpciones.filter(c => c.nivel1 === filtroNivel1)
      : todosParaOpciones
  ).map(c => ({ id: String(c.id), label: `${c.nivel2} / ${c.nivel3}` }))

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <GitBranch size={22} className="text-azul" />
          Clasificador de Prácticas
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Gestión jerárquica de clasificadores (3 niveles)</p>
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

      {/* ── SOLAPA MAESTRO ──────────────────────────────────────── */}
      {solapa === 'maestro' && (
        <>
          {/* Filtros + Acciones */}
          <div className="flex flex-wrap gap-3 mb-4 items-end">

            {/* Clasificación — Nivel 1 (combobox buscable) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Clasificación — Nivel 1</label>
              <Combobox
                options={nivel1Opts}
                value={filtroNivel1}
                onChange={val => {
                  setFiltroNivel1(val)
                  setFiltroNivel23('')   // limpiar nivel 2/3 al cambiar nivel 1
                }}
                placeholder="Buscar nivel 1..."
                className="min-w-[180px]"
              />
            </div>

            {/* Clasificación — Nivel 2 / 3 (combobox buscable) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Clasificación — Nivel 2 / 3</label>
              <Combobox
                options={nivel23Opts}
                value={filtroNivel23}
                onChange={val => setFiltroNivel23(val)}
                placeholder={filtroNivel1 ? 'Buscar nivel 2 / 3...' : 'Buscar nivel 2 / 3...'}
                className="min-w-[220px]"
              />
            </div>

            {/* Estado */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Estado</label>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Todos</option>
                {ESTADOS.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {/* Búsqueda libre */}
            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
              <label className="text-xs font-medium text-slate-500">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar en todos los niveles…"
                  value={filtroBuscar}
                  onChange={e => setFiltroBuscar(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm w-full"
                />
                {filtroBuscar && (
                  <button onClick={() => setFiltroBuscar('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Botones Exportar / Importar / Nuevo */}
            <button
              onClick={exportar}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <Download size={15} /> Exportar
            </button>
            <button
              onClick={abrirImport}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <Upload size={15} /> Importar
            </button>
            <button
              onClick={abrirCrear}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg font-medium shadow-sm transition-colors"
            >
              <Plus size={16} /> Nuevo
            </button>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200" style={{ backgroundColor: '#8AB1CB' }}>
                    <th className="px-4 py-3 text-left font-semibold text-white">ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Nivel 1</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Nivel 2</th>
                    <th className="px-4 py-3 text-left font-semibold text-white">Nivel 3</th>
                    <th className="px-4 py-3 text-center font-semibold text-white">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="flex justify-center items-center text-slate-400">
                          <RefreshCw size={20} className="animate-spin mr-2" />
                          Cargando…
                        </div>
                      </td>
                    </tr>
                  ) : (filtroNivel23
                      ? clasificadores.filter(c => String(c.id) === filtroNivel23)
                      : clasificadores
                    ).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        No hay clasificadores que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    (filtroNivel23
                      ? clasificadores.filter(c => String(c.id) === filtroNivel23)
                      : clasificadores
                    ).map(c => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.id}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{c.nivel1}</td>
                        <td className="px-4 py-3 text-slate-700">{c.nivel2}</td>
                        <td className="px-4 py-3 text-slate-600">{c.nivel3}</td>
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
                              className="p-1.5 text-slate-400 hover:text-azul hover:bg-azul/10 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => { setHistorialItem(c); setModalHistorial(true) }}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Ver historial"
                            >
                              <History size={15} />
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
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
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
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Desde"
            />
            <input
              type="date"
              value={audHasta}
              onChange={e => setAudHasta(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Hasta"
            />
            <button
              onClick={() => { setAudUsuario(''); setAudAccion(''); setAudDesde(''); setAudHasta('') }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Limpiar
            </button>
          </div>

          {cargandoAuditoria ? (
            <div className="flex justify-center items-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" /> Cargando auditoría…
            </div>
          ) : auditoriaGlobal.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No hay registros de auditoría.
            </div>
          ) : (
            <AuditTableClasificador logs={auditoriaGlobal} showClasificador />
          )}
        </>
      )}

      {/* ── MODAL CREAR / EDITAR ─────────────────────────────────── */}
      {modalForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {editando ? 'Editar Clasificador' : 'Nuevo Clasificador'}
              </h2>
              <button onClick={cerrarModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); guardarForm() }} className="px-6 py-5 space-y-4">
              {errorForm && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} />{errorForm}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nivel 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel1}
                  onChange={e => setForm(f => ({ ...f, nivel1: e.target.value }))}
                  maxLength={150}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Ej: DIAGNÓSTICO POR IMÁGENES"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nivel 2 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel2}
                  onChange={e => setForm(f => ({ ...f, nivel2: e.target.value }))}
                  maxLength={150}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Ej: TOMOGRAFÍA"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nivel 3 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nivel3}
                  onChange={e => setForm(f => ({ ...f, nivel3: e.target.value }))}
                  maxLength={150}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul/30"
                  placeholder="Ej: SIMPLE"
                />
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutCrear.isPending || mutActualizar.isPending}
                  className="px-5 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white rounded-lg font-medium disabled:opacity-60"
                >
                  {(mutCrear.isPending || mutActualizar.isPending) ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL HISTORIAL ──────────────────────────────────────── */}
      {modalHistorial && historialItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-800">Historial de cambios</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {historialItem.nivel1} / {historialItem.nivel2} / {historialItem.nivel3}
                </p>
              </div>
              <button onClick={() => setModalHistorial(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {cargandoHistorial ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <RefreshCw size={20} className="animate-spin mr-2" /> Cargando…
                </div>
              ) : historialLogs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Sin historial.</p>
              ) : (
                <AuditTableClasificador logs={historialLogs} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL IMPORTACIÓN ────────────────────────────────────── */}
      {modalImport && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Importar desde Excel</h2>
              <button onClick={cerrarImport} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <X size={18} />
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

// ── Tabla de auditoría de clasificadores ──────────────────────
function AuditTableClasificador({
  logs,
  showClasificador = false,
}: {
  logs: ClasificadorPracticaAuditLog[]
  showClasificador?: boolean
}) {
  const [expandido, setExpandido] = useState<number | null>(null)

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {showClasificador && (
              <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Clasificador</th>
            )}
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
              <tr
                key={log.id}
                onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
              >
                {showClasificador && (
                  <td className="px-3 py-2 text-slate-700 font-medium">
                    <span>{log.nivel1Clasificador}</span>
                    {log.nivel2Clasificador && <span className="text-slate-400"> / {log.nivel2Clasificador}</span>}
                    {log.nivel3Clasificador && <span className="text-slate-400"> / {log.nivel3Clasificador}</span>}
                  </td>
                )}
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${badgeAccion(log.accion)}`}>
                    {LABEL_ACCION[log.accion] ?? log.accion}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{fmtFechaHora(log.fechaEvento)}</td>
                <td className="px-3 py-2 text-slate-600">{log.usuarioNombre || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{log.origen}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={e => { e.stopPropagation(); setExpandido(expandido === log.id ? null : log.id) }}
                    className="text-azul hover:underline flex items-center gap-1"
                  >
                    {expandido === log.id ? 'Ocultar' : 'Ver'} <Clock size={11} />
                  </button>
                </td>
              </tr>
              {expandido === log.id && (
                <tr key={`${log.id}-det`} className="bg-slate-50 border-b border-slate-100">
                  <td colSpan={showClasificador ? 6 : 5} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Antes</p>
                        <p>N1: {log.nivel1Anterior ?? '—'}</p>
                        <p>N2: {log.nivel2Anterior ?? '—'}</p>
                        <p>N3: {log.nivel3Anterior ?? '—'}</p>
                        <p>Activo: {log.activoAnterior == null ? '—' : log.activoAnterior ? 'Sí' : 'No'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Después</p>
                        <p>N1: {log.nivel1Nuevo ?? '—'}</p>
                        <p>N2: {log.nivel2Nuevo ?? '—'}</p>
                        <p>N3: {log.nivel3Nuevo ?? '—'}</p>
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
