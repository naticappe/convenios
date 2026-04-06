// ============================================================
// PÁGINA: Prácticas Médicas
// 2 solapas: Maestro + Auditoría
// Filtros en 2 filas + botones integrados
// Clasificación OBLIGATORIA con 2 comboboxes (Nivel1 → Nivel2/3)
// Importador con vista previa en 2 solapas (Prácticas + Detalle)
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { practicasService, type FiltrosPracticas } from '../../services/practicasService'
import PracticaDetalle from '../../components/PracticaDetalle'
import api from '../../services/api'
import type {
  PracticaList,
  CrearEditarPractica,
  ActualizarVigenciaPractica,
  PracticaAuditLog,
  NomencladorMaestroList,
  ConceptoMaestroList,
  UnidadArancelList,
  ClasificadorPracticaList,
  PracticaImportPreview,
  ConfirmarImportacionPractica,
} from '../../types'
import {
  FileText, Plus, Pencil, Search,
  ChevronDown, ChevronRight, Download, Upload,
  ClipboardList, X, RefreshCw, AlertTriangle,
  CheckCircle2, AlertCircle, History, Clock,
} from 'lucide-react'

// ── Tipos locales ──────────────────────────────────────────────
type Solapa       = 'maestro' | 'auditoria'
type ImportSolapa = 'practicas' | 'detalle'

// ── Constantes ─────────────────────────────────────────────────
const FORM_VACIO: CrearEditarPractica = {
  codigo:                 '',
  nombre:                 '',
  nomencladorId:          0,
  clasificadorPracticaId: undefined,
  vigenciaDesde:          new Date().toISOString().slice(0, 10),
  vigenciaHasta:          undefined,
}


// ── Badge de estado — clickeable para toggle de vigencia ───────
function BadgeEstado({
  activo, onClick, loading = false,
}: {
  activo: boolean;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading || !onClick}
      title={onClick ? (activo ? 'Clic para inactivar' : 'Clic para activar') : undefined}
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-all
        ${activo
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
        disabled:opacity-60`}
    >
      {loading
        ? <RefreshCw size={10} className="animate-spin" />
        : <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-green-500' : 'bg-slate-400'}`} />
      }
      {activo ? 'Activo' : 'Inactivo'}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// COMBOBOX — Buscador con dropdown filtrado por texto
// ══════════════════════════════════════════════════════════════
interface ComboboxOption { id: string; label: string }
interface ComboboxProps {
  options:      ComboboxOption[]
  value:        string
  onChange:     (id: string) => void
  placeholder?: string
  disabled?:    boolean
  invalid?:     boolean   // borde rojo cuando requerido y vacío
  className?:   string
}

function Combobox({
  options, value, onChange, placeholder,
  disabled, invalid, className = '',
}: ComboboxProps) {
  const [inputVal, setInputVal] = useState('')
  const [open,     setOpen]     = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sincroniza label cuando cambia el valor externo
  useEffect(() => {
    const opt = options.find(o => o.id === value)
    setInputVal(opt ? opt.label : '')
  }, [value, options])

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Restaura el label del valor seleccionado
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
          onChange={e => {
            setInputVal(e.target.value)
            setOpen(true)
            if (!e.target.value) onChange('')
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`w-full border rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            ${invalid ? 'border-red-300 bg-red-50/20' : 'border-slate-300'}`}
        />
        {value && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            onClick={() => { onChange(''); setInputVal(''); }}
          >
            <X size={12} />
          </button>
        ) : (
          <ChevronDown
            size={13}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <div className="max-h-52 overflow-y-auto">
              {filtered.map(opt => (
                <div
                  key={opt.id}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                    opt.id === value
                      ? 'bg-azul/10 text-azul font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  onMouseDown={e => {
                    e.preventDefault()
                    onChange(opt.id)
                    setInputVal(opt.label)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2.5 text-sm text-slate-400 text-center">
              Sin resultados
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Practicas() {
  const qc          = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Solapas ───────────────────────────────────────────────
  const [solapa, setSolapa] = useState<Solapa>('maestro')

  // ── Filtros maestro ───────────────────────────────────────
  const [nomencladorId,  setNomencladorId]  = useState<number | undefined>()
  const [filtroNivel1,   setFiltroNivel1]   = useState('')
  const [clasificadorId, setClasificadorId] = useState<number | undefined>()
  const [estado,         setEstado]         = useState('')
  const [buscar,         setBuscar]         = useState('')

  // ── Modal crear/editar ────────────────────────────────────
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando,     setEditando]     = useState<PracticaList | null>(null)
  const [form,         setForm]         = useState<CrearEditarPractica>(FORM_VACIO)
  const [formNivel1,   setFormNivel1]   = useState('')   // nivel1 seleccionado en modal
  const [intentoGuardar, setIntentoGuardar] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // ── Toggle vigencia (chip) ────────────────────────────────
  const [vigToggleId,  setVigToggleId]  = useState<number | null>(null)  // id de la práctica en proceso

  // ── Modal Auditoría por práctica ─────────────────────────
  const [modalAudit,    setModalAudit]    = useState(false)
  const [auditPractica, setAuditPractica] = useState<PracticaList | null>(null)

  // ── Modal importar ────────────────────────────────────────
  const [modalImport,   setModalImport]   = useState(false)
  const [importPreview, setImportPreview] = useState<PracticaImportPreview | null>(null)
  const [importSolapa,  setImportSolapa]  = useState<ImportSolapa>('practicas')
  const [importLoading, setImportLoading] = useState(false)
  const [importError,   setImportError]   = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  // ── Accordion ─────────────────────────────────────────────
  const [expandidoId, setExpandidoId] = useState<number | null>(null)

  // ── Auditoría filtros ─────────────────────────────────────
  const [audAccion,  setAudAccion]  = useState('')
  const [audEntidad, setAudEntidad] = useState('')

  // ── Queries: datos maestros ───────────────────────────────
  // Usa NomencladorMaestro (tabla correcta con vigencias)
  const { data: nomencladores = [] } = useQuery<NomencladorMaestroList[]>({
    queryKey: ['nomenclador-maestro-lista'],
    queryFn:  () => api.get('/nomenclador').then(r => r.data),
  })

  const { data: clasificadores = [] } = useQuery<ClasificadorPracticaList[]>({
    queryKey: ['clasificadores-lista'],
    queryFn:  () => api.get('/clasificador-practicas').then(r => r.data),
  })

  const { data: conceptos = [] } = useQuery<ConceptoMaestroList[]>({
    queryKey: ['conceptos-lista'],
    queryFn:  () => api.get('/concepto').then(r => r.data),
  })

  const { data: unidades = [] } = useQuery<UnidadArancelList[]>({
    queryKey: ['unidades-lista'],
    queryFn:  () => api.get('/unidad-arancel').then(r => r.data),
  })

  // ── Opciones derivadas para los comboboxes ─────────────────
  const nomencladoresActivos  = nomencladores.filter(n => n.activo)
  const clasificadoresActivos = clasificadores.filter(c => c.activo)

  // Nivel 1 únicos ordenados
  const nivel1Options: ComboboxOption[] = Array.from(
    new Set(clasificadoresActivos.map(c => c.nivel1))
  ).sort().map(n => ({ id: n, label: n }))

  // Nivel2/3 para el filtro de la tabla (filtrado por filtroNivel1)
  const nivel23FiltroOptions: ComboboxOption[] = (
    filtroNivel1
      ? clasificadoresActivos.filter(c => c.nivel1 === filtroNivel1)
      : clasificadoresActivos
  ).map(c => ({ id: String(c.id), label: `${c.nivel2} / ${c.nivel3}` }))

  // Nivel2/3 para el modal (filtrado por formNivel1)
  const nivel23ModalOptions: ComboboxOption[] = (
    formNivel1
      ? clasificadoresActivos.filter(c => c.nivel1 === formNivel1)
      : clasificadoresActivos
  ).map(c => ({ id: String(c.id), label: `${c.nivel2} / ${c.nivel3}` }))

  // ── Lista prácticas (requiere nomencladorId) ──────────────
  const filtros: FiltrosPracticas | null = nomencladorId
    ? { nomencladorId, clasificadorId, estado: estado || undefined, buscar: buscar || undefined }
    : null

  const { data: practicas = [], isLoading } = useQuery({
    queryKey: ['practicas', filtros],
    queryFn:  () => practicasService.listar(filtros!),
    enabled:  !!filtros,
  })

  // ── Auditoría ─────────────────────────────────────────────
  const { data: auditoria = [], isLoading: loadingAud } = useQuery<PracticaAuditLog[]>({
    queryKey: ['practicas-auditoria', audAccion, audEntidad],
    queryFn:  () => practicasService.auditoriaGlobal({
      accion:  audAccion  || undefined,
      entidad: audEntidad || undefined,
    }),
    enabled: solapa === 'auditoria',
  })

  // ── Mutations ─────────────────────────────────────────────
  const guardarMutation = useMutation({
    mutationFn: (dto: CrearEditarPractica) =>
      editando
        ? practicasService.actualizar(editando.id, dto)
        : practicasService.crear(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practicas'] })
      cerrarModal()
    },
    onError: (e: Error) => setError(e.message),
  })

  const vigenciaMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: ActualizarVigenciaPractica }) =>
      practicasService.actualizarVigencia(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practicas'] })
      setVigToggleId(null)
    },
    onError: (e: Error) => { setError(e.message); setVigToggleId(null) },
  })

  // ── Query auditoría por práctica ──────────────────────────
  const { data: auditLogs = [], isLoading: loadingAudit } = useQuery<PracticaAuditLog[]>({
    queryKey: ['practica-auditoria-id', auditPractica?.id],
    queryFn:  () => practicasService.auditoriaById(auditPractica!.id),
    enabled:  !!auditPractica,
  })

  // ── Helpers de nombre para la preview ─────────────────────
  const getNomencladorNombre = (id: number) =>
    nomencladores.find(n => n.id === id)?.nombre ?? `#${id}`

  const getClasificadorNombre = (id?: number) => {
    if (!id) return '—'
    const c = clasificadores.find(c => c.id === id)
    return c ? `${c.nivel1} / ${c.nivel2} / ${c.nivel3}` : `#${id}`
  }

  const getConceptoNombre = (id: number) =>
    conceptos.find(c => c.id === id)?.nombre ?? `#${id}`

  const getUnidadNombre = (id: number) =>
    unidades.find(u => u.id === id)?.nombre ?? `#${id}`

  // ── Handlers: modal crear/editar ──────────────────────────
  const cerrarModal = () => {
    setModalAbierto(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setFormNivel1('')
    setIntentoGuardar(false)
    setError(null)
  }

  const abrirNueva = () => {
    setEditando(null)
    setForm({ ...FORM_VACIO, nomencladorId: nomencladorId ?? 0 })
    setFormNivel1('')
    setIntentoGuardar(false)
    setError(null)
    setModalAbierto(true)
  }

  const abrirEditar = (p: PracticaList) => {
    setEditando(p)
    const clf = clasificadores.find(c => c.id === p.clasificadorPracticaId)
    setFormNivel1(clf?.nivel1 ?? '')
    setForm({
      codigo:                 p.codigo,
      nombre:                 p.nombre,
      nomencladorId:          p.nomencladorId,
      clasificadorPracticaId: p.clasificadorPracticaId ?? undefined,
    })
    setIntentoGuardar(false)
    setError(null)
    setModalAbierto(true)
  }

  const handleSubmitModal = (e: React.FormEvent) => {
    e.preventDefault()
    setIntentoGuardar(true)
    if (!form.clasificadorPracticaId) return   // bloquea si falta clasificación
    // En alta, enviar vigencia. En edición, omitir vigencia (se gestiona por botón separado).
    const dto: CrearEditarPractica = editando
      ? { codigo: form.codigo, nombre: form.nombre, nomencladorId: form.nomencladorId, clasificadorPracticaId: form.clasificadorPracticaId }
      : {
          ...form,
          vigenciaDesde: form.vigenciaDesde
            ? new Date(form.vigenciaDesde).toISOString()
            : new Date().toISOString(),
          vigenciaHasta: form.vigenciaHasta
            ? new Date(form.vigenciaHasta).toISOString()
            : undefined,
        }
    guardarMutation.mutate(dto)
  }

  // ── Handler: toggle vigencia por chip ────────────────────
  const toggleVigencia = (p: PracticaList) => {
    setVigToggleId(p.id)
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    vigenciaMutation.mutate({
      id: p.id,
      dto: {
        vigenciaDesde: p.vigenciaDesde,
        vigenciaHasta: p.activo
          ? ayer.toISOString()    // inactivar → fin = ayer
          : undefined,            // activar   → vigencia indefinida
      },
    })
  }

  // ── Handlers: accordion ───────────────────────────────────
  const toggleExpandido = (id: number) =>
    setExpandidoId(prev => prev === id ? null : id)

  // ── Handlers: exportar ────────────────────────────────────
  const exportar = async () => {
    if (!filtros) return
    const blob = await practicasService.exportar(filtros)
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'practicas_export.xlsx'; a.click()
    URL.revokeObjectURL(url)
  }

  // ── Handlers: importar ────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportLoading(true)
    setImportError(null)
    setImportSuccess(false)
    try {
      const preview = await practicasService.importarPreview(file)
      setImportPreview(preview)
      setImportSolapa('practicas')
      setModalImport(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar el archivo')
    } finally {
      setImportLoading(false)
    }
  }

  const confirmarImportacion = async () => {
    if (!importPreview) return
    const dto: ConfirmarImportacionPractica = {
      transactionId:  importPreview.transactionId,
      filasPracticas: importPreview.filasPracticas,
      filasDetalle:   importPreview.filasDetalle,
    }
    setImportLoading(true)
    setImportError(null)
    try {
      await practicasService.importarConfirmar(dto)
      qc.invalidateQueries({ queryKey: ['practicas'] })
      setImportSuccess(true)
      setTimeout(() => {
        setModalImport(false)
        setImportPreview(null)
        setImportSuccess(false)
      }, 1800)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al confirmar la importación')
    } finally {
      setImportLoading(false)
    }
  }

  const cerrarModalImport = () => {
    setModalImport(false)
    setImportPreview(null)
    setImportError(null)
    setImportSuccess(false)
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* ── Encabezado ─────────────────────────────────────── */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList size={22} className="text-azul" />
          Prácticas Médicas
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {practicas.length > 0
            ? `${practicas.length} prácticas encontradas`
            : 'Seleccioná un nomenclador para comenzar'}
        </p>
      </div>

      {/* ── Solapas ────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 mb-5">
        {(['maestro', 'auditoria'] as Solapa[]).map(s => (
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

      {/* ════════════════════════════════════════════════════
          SOLAPA MAESTRO
      ════════════════════════════════════════════════════ */}
      {solapa === 'maestro' && (
        <>
          {/* ── Panel filtros + botones ──────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* ── FILA 1: Nomenclador | Nivel 1 | Nivel 2/3 | → | Importar | Exportar | Nueva ── */}
            <div className="flex items-end gap-3 w-full mb-3">

              {/* Nomenclador */}
              <div className="flex flex-col gap-1 w-[220px] shrink-0">
                <label className="text-xs font-medium text-slate-500">
                  Nomenclador <span className="text-red-500">*</span>
                </label>
                <select
                  value={nomencladorId ?? ''}
                  onChange={e => {
                    setNomencladorId(e.target.value ? Number(e.target.value) : undefined)
                    setFiltroNivel1('')
                    setClasificadorId(undefined)
                    setExpandidoId(null)
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-azul/30"
                >
                  <option value="">Seleccionar nomenclador...</option>
                  {nomencladoresActivos.map(n => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Clasificación Nivel 1 */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs font-medium text-slate-500">Clasificación — Nivel 1</label>
                <Combobox
                  options={nivel1Options}
                  value={filtroNivel1}
                  onChange={val => { setFiltroNivel1(val); setClasificadorId(undefined) }}
                  placeholder="Buscar nivel 1..."
                  disabled={!nomencladorId}
                  className="w-full"
                />
              </div>

              {/* Clasificación Nivel 2 / 3 */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs font-medium text-slate-500">Clasificación — Nivel 2 / 3</label>
                <Combobox
                  options={nivel23FiltroOptions}
                  value={clasificadorId ? String(clasificadorId) : ''}
                  onChange={val => setClasificadorId(val ? Number(val) : undefined)}
                  placeholder="Buscar nivel 2 / 3..."
                  disabled={!nomencladorId}
                  className="w-full"
                />
              </div>

              {/* Botones de acción — siempre visibles en fila 1 */}
              <div className="flex items-end gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importLoading || !nomencladorId}
                  className="flex items-center gap-1.5 border border-slate-300 rounded-lg
                    hover:bg-slate-50 text-slate-600 px-3 py-2 text-sm font-medium
                    transition-colors disabled:opacity-40"
                >
                  {importLoading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                  Importar
                </button>
                <button
                  onClick={exportar}
                  disabled={!nomencladorId}
                  className="flex items-center gap-1.5 border border-azul-oscuro rounded-lg
                    hover:bg-azul/5 text-azul-oscuro px-3 py-2 text-sm font-medium
                    transition-colors disabled:opacity-40"
                >
                  <Download size={14} />Exportar
                </button>
                <button
                  onClick={abrirNueva}
                  disabled={!nomencladorId}
                  className="flex items-center gap-2 bg-azul hover:bg-azul-oscuro text-white
                    px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm
                    disabled:opacity-40"
                >
                  <Plus size={15} />Nueva Práctica
                </button>
              </div>
            </div>

            {/* ── FILA 2: Estado | Buscar (ancho) | Limpiar filtros ── */}
            <div className="flex items-end gap-3 w-full">

              {/* Estado */}
              <div className="flex flex-col gap-1 w-[140px] shrink-0">
                <label className="text-xs font-medium text-slate-500">Estado</label>
                <select
                  value={estado}
                  onChange={e => setEstado(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-azul/30"
                >
                  <option value="">Todos</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              {/* Buscador — ocupa todo el espacio restante */}
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <label className="text-xs font-medium text-slate-500">Buscar</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Código o nombre de práctica..."
                    value={buscar}
                    onChange={e => setBuscar(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 border border-slate-300 rounded-lg text-sm bg-white
                      focus:outline-none focus:ring-2 focus:ring-azul/30"
                  />
                  {buscar && (
                    <button
                      onClick={() => setBuscar('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Limpiar filtros */}
              {(nomencladorId || filtroNivel1 || clasificadorId || estado || buscar) && (
                <button
                  onClick={() => {
                    setNomencladorId(undefined)
                    setFiltroNivel1('')
                    setClasificadorId(undefined)
                    setEstado('')
                    setBuscar('')
                    setExpandidoId(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500
                    border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-700
                    transition-colors shrink-0"
                >
                  <X size={13} /> Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Error inline de importación */}
          {importError && !modalImport && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50
              border border-red-100 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle size={14} />{importError}
              <button
                className="ml-auto text-red-400 hover:text-red-600"
                onClick={() => setImportError(null)}
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* ── Grilla ─────────────────────────────────────── */}
          {!nomencladorId ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
              <FileText size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">
                Seleccioná un nomenclador para ver sus prácticas.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <RefreshCw size={20} className="animate-spin mr-2" />Cargando...
            </div>
          ) : practicas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText size={32} className="mx-auto mb-2 opacity-30" />
              <p>No hay prácticas que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200" style={{ backgroundColor: '#8AB1CB' }}>
                    <th className="w-8 px-3" />
                    <th className="text-left px-4 py-3 font-semibold text-white">Código</th>
                    <th className="text-left px-4 py-3 font-semibold text-white">Nombre</th>
                    <th className="text-left px-4 py-3 font-semibold text-white">Conceptos</th>
                    <th className="text-left px-4 py-3 font-semibold text-white">Vigencia</th>
                    <th className="text-center px-4 py-3 font-semibold text-white">Estado</th>
                    <th className="text-center px-4 py-3 font-semibold text-white">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {practicas.map(p => (
                    <>
                      <tr
                        key={p.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer
                          transition-colors ${expandidoId === p.id ? 'bg-blue-50/30' : ''}`}
                        onClick={() => toggleExpandido(p.id)}
                      >
                        <td className="px-3 py-3 text-slate-400">
                          {expandidoId === p.id
                            ? <ChevronDown size={16} />
                            : <ChevronRight size={16} />}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-azul">
                          {p.codigo}
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {p.nombre}
                          {p.clasificadorNombre && (
                            <span className="ml-2 text-xs text-slate-400 font-normal">
                              [{p.clasificadorNombre}]
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.conceptos.map(c => (
                              <span
                                key={c.conceptoId}
                                className="bg-azul/10 text-azul text-xs font-semibold px-1.5 py-0.5 rounded"
                                title={c.conceptoNombre}
                              >
                                {c.conceptoSigla}
                              </span>
                            ))}
                            {p.conceptos.length === 0 && (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {p.vigenciaDesde.slice(0, 10)}
                          {p.vigenciaHasta
                            ? ` → ${p.vigenciaHasta.slice(0, 10)}`
                            : ' → ∞'}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <BadgeEstado
                            activo={p.activo}
                            loading={vigToggleId === p.id}
                            onClick={() => toggleVigencia(p)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="flex justify-center gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => abrirEditar(p)}
                              className="p-1.5 text-azul hover:bg-azul/10 rounded-lg"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => { setAuditPractica(p); setModalAudit(true) }}
                              className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                              title="Ver historial de auditoría"
                            >
                              <History size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandidoId === p.id && (
                        <tr key={`detalle-${p.id}`}>
                          <td colSpan={7} className="p-0">
                            <PracticaDetalle
                              practicaId={p.id}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          SOLAPA AUDITORÍA
      ════════════════════════════════════════════════════ */}
      {solapa === 'auditoria' && (
        <>
          <div className="flex gap-3 mb-4">
            <select
              value={audAccion}
              onChange={e => setAudAccion(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-azul/30"
            >
              <option value="">Todas las acciones</option>
              <option value="ALTA">ALTA</option>
              <option value="MODIFICACION">MODIFICACION</option>
              <option value="CAMBIO_VIGENCIA">CAMBIO_VIGENCIA</option>
              <option value="IMPORTACION">IMPORTACION</option>
            </select>
            <select
              value={audEntidad}
              onChange={e => setAudEntidad(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white
                focus:outline-none focus:ring-2 focus:ring-azul/30"
            >
              <option value="">Todas las entidades</option>
              <option value="PRACTICA">PRACTICA</option>
              <option value="PRACTICA_CONCEPTO">PRACTICA_CONCEPTO</option>
            </select>
          </div>

          {loadingAud ? (
              <div className="flex justify-center py-16 text-slate-400">
                <RefreshCw size={20} className="animate-spin mr-2" />Cargando auditoría...
              </div>
            ) : auditoria.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FileText size={32} className="mx-auto mb-2 opacity-30" />
                <p>Sin registros de auditoría.</p>
              </div>
            ) : (
              <AuditTableGlobalPractica logs={auditoria} />
            )}
        </>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL CREAR / EDITAR PRÁCTICA
          PASO 1: Clasificación OBLIGATORIA con dos comboboxes
      ════════════════════════════════════════════════════ */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                {editando ? 'Editar Práctica' : 'Nueva Práctica'}
              </h2>
              <button
                onClick={cerrarModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertTriangle size={15} />{error}
                </div>
              )}

              {/* Nomenclador */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nomenclador <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.nomencladorId || ''}
                  onChange={e => setForm({ ...form, nomencladorId: Number(e.target.value) })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-azul/30"
                >
                  <option value="">Seleccionar...</option>
                  {nomencladoresActivos.map(n => (
                    <option key={n.id} value={n.id}>{n.nombre}</option>
                  ))}
                </select>
              </div>

              {/* Código */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.codigo}
                  onChange={e => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Ej: 05.01.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-azul/30"
                />
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Descripción de la práctica"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-azul/30"
                />
              </div>

              {/* ── Clasificación OBLIGATORIA — dos comboboxes ── */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Clasificación <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {/* Buscador 1: Nivel 1 */}
                  <Combobox
                    options={nivel1Options}
                    value={formNivel1}
                    onChange={val => {
                      setFormNivel1(val)
                      // Al cambiar Nivel 1, limpiar la selección de Nivel 2/3
                      setForm(f => ({ ...f, clasificadorPracticaId: undefined }))
                    }}
                    placeholder="Nivel 1..."
                    invalid={intentoGuardar && !form.clasificadorPracticaId}
                    className="flex-1"
                  />
                  {/* Buscador 2: Nivel 2 / 3 (filtrado por Nivel 1) */}
                  <Combobox
                    options={nivel23ModalOptions}
                    value={form.clasificadorPracticaId ? String(form.clasificadorPracticaId) : ''}
                    onChange={val => setForm(f => ({
                      ...f,
                      clasificadorPracticaId: val ? Number(val) : undefined,
                    }))}
                    placeholder={
                      nivel23ModalOptions.length === 0
                        ? 'Seleccioná Nivel 1 primero'
                        : 'Nivel 2 / 3...'
                    }
                    disabled={nivel23ModalOptions.length === 0}
                    invalid={intentoGuardar && !form.clasificadorPracticaId}
                    className="flex-[1.5]"
                  />
                </div>
                {intentoGuardar && !form.clasificadorPracticaId && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={11} />
                    La clasificación es obligatoria. Seleccioná Nivel 1 y luego Nivel 2 / 3.
                  </p>
                )}
                {form.clasificadorPracticaId && (
                  <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 size={11} />
                    {getClasificadorNombre(form.clasificadorPracticaId)}
                  </p>
                )}
              </div>

              {/* ── Vigencia (solo en alta) ── */}
              {!editando && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Vigencia
                  </label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-0.5">
                        Desde <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={form.vigenciaDesde ?? ''}
                        onChange={e => setForm({ ...form, vigenciaDesde: e.target.value || undefined })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-azul/30"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-slate-400 mb-0.5">
                        Hasta
                        <span className="text-slate-400 font-normal ml-1">(vacío = indefinida)</span>
                      </label>
                      <input
                        type="date"
                        value={form.vigenciaHasta ?? ''}
                        onChange={e => setForm({ ...form, vigenciaHasta: e.target.value || undefined })}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-azul/30"
                      />
                    </div>
                  </div>
                  {!form.vigenciaHasta && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      Sin fecha de fin → vigencia indefinida
                    </p>
                  )}
                </div>
              )}

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
                  disabled={guardarMutation.isPending}
                  className="px-5 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white
                    rounded-lg font-medium disabled:opacity-60"
                >
                  {guardarMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL AUDITORÍA POR PRÁCTICA
      ════════════════════════════════════════════════════ */}
      {modalAudit && auditPractica && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <History size={16} className="text-azul" />
                Historial —{' '}
                <span className="font-mono text-azul text-sm">{auditPractica.codigo}</span>
                <span className="text-slate-500 font-normal text-sm">{auditPractica.nombre}</span>
              </h2>
              <button
                onClick={() => { setModalAudit(false); setAuditPractica(null) }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              {loadingAudit ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <RefreshCw size={18} className="animate-spin mr-2" />Cargando...
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Sin registros de auditoría.</p>
              ) : (
                <AuditTablePractica logs={auditLogs} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          MODAL IMPORTAR — PASO 2
          Dos solapas: Prácticas / Detalle con preview completo
      ════════════════════════════════════════════════════ */}
      {modalImport && importPreview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

            {/* ── Header ── */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Upload size={16} className="text-azul" />
                  Vista previa de importación
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Revisá todos los cambios antes de confirmar.
                  {' '}ID:{' '}
                  <span className="font-mono">{importPreview.transactionId.slice(0, 8)}…</span>
                </p>
              </div>
              <button
                onClick={cerrarModalImport}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* ── Errores del archivo ── */}
            {importPreview.errores.length > 0 && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-100 rounded-lg p-3 flex-shrink-0">
                <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={12} />
                  {importPreview.errores.length} error(es) detectado(s) — no se puede confirmar la importación
                </p>
                <ul className="text-xs text-red-600 space-y-0.5 max-h-20 overflow-y-auto">
                  {importPreview.errores.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}

            {/* ── Solapas internas ── */}
            <div className="flex border-b border-slate-200 px-6 pt-4 flex-shrink-0">
              {(['practicas', 'detalle'] as ImportSolapa[]).map(s => {
                const count = s === 'practicas'
                  ? importPreview.filasPracticas.length
                  : importPreview.filasDetalle.length
                const errCount = s === 'practicas'
                  ? importPreview.filasPracticas.filter(r => r.error).length
                  : importPreview.filasDetalle.filter(r => r.error).length
                return (
                  <button
                    key={s}
                    onClick={() => setImportSolapa(s)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                      flex items-center gap-2 ${
                      importSolapa === s
                        ? 'border-azul text-azul'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {s === 'practicas' ? 'Prácticas' : 'Detalle'}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      importSolapa === s ? 'bg-azul/10 text-azul' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {count}
                    </span>
                    {errCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                        {errCount} error{errCount > 1 ? 'es' : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* ── Leyenda de colores ── */}
            <div className="flex gap-5 px-6 py-2.5 flex-shrink-0 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                Nueva
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded bg-amber-50 border border-amber-300" />
                Modificada
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded bg-white border border-slate-200" />
                Sin cambios
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <div className="w-3 h-3 rounded bg-red-50 border border-red-300" />
                Error
              </div>
            </div>

            {/* ── Contenido solapas ── */}
            <div className="flex-1 overflow-auto">

              {/* Solapa Prácticas */}
              {importSolapa === 'practicas' && (
                importPreview.filasPracticas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileText size={32} className="mb-2 opacity-30" />
                    <p>No hay prácticas en el archivo</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 w-28">Estado</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Código</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Nombre</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Nomenclador</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Clasificador</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Vigencia Desde</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.filasPracticas.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${
                            row.error
                              ? 'bg-red-50'
                              : row.esNueva
                                ? 'bg-green-50'
                                : row.hayDiferencia
                                  ? 'bg-amber-50/60'
                                  : ''
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            {row.error ? (
                              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                                <AlertCircle size={11} />Error
                              </span>
                            ) : row.esNueva ? (
                              <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                                <CheckCircle2 size={11} />Nueva
                              </span>
                            ) : row.hayDiferencia ? (
                              <span className="text-xs text-amber-700 font-medium">Modificada</span>
                            ) : (
                              <span className="text-xs text-slate-400">Sin cambios</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-azul">
                            {row.codigo}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[200px] truncate">
                            {row.nombre}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {getNomencladorNombre(row.nomencladorId)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {getClasificadorNombre(row.clasificadorPracticaId)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {row.vigenciaDesde?.slice(0, 10)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {/* Solapa Detalle */}
              {importSolapa === 'detalle' && (
                importPreview.filasDetalle.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <FileText size={32} className="mb-2 opacity-30" />
                    <p>No hay filas de detalle en el archivo</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Código</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Nomenclador</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Concepto</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Unidad</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Unidades</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500">Cantidad</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Vigencia Desde</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.filasDetalle.map((row, i) => (
                        <tr
                          key={i}
                          className={`border-b border-slate-100 ${row.error ? 'bg-red-50' : ''}`}
                        >
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-azul">
                            {row.codigo}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {getNomencladorNombre(row.nomencladorId)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {getConceptoNombre(row.conceptoMaestroId)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {getUnidadNombre(row.unidadArancelId)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 text-right">
                            {row.unidades}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500 text-right">
                            {row.cantidad}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-500">
                            {row.vigenciaDesde?.slice(0, 10)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-red-600">
                            {row.error ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>

            {/* ── Footer con resumen + confirmación ── */}
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0 gap-4">
              {/* Resumen */}
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-400" />
                  {importPreview.filasPracticas.filter(r => r.esNueva).length} nuevas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {importPreview.filasPracticas.filter(r => !r.esNueva && r.hayDiferencia).length} modificadas
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  {importPreview.filasDetalle.length} filas de detalle
                </span>
              </div>

              {/* Error de confirmación */}
              {importError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50
                  rounded-lg px-2.5 py-1.5 border border-red-100">
                  <AlertTriangle size={12} />{importError}
                </div>
              )}

              {/* Botones */}
              {importSuccess ? (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium ml-auto">
                  <CheckCircle2 size={16} />
                  ¡Importación exitosa!
                </div>
              ) : (
                <div className="flex gap-3 ml-auto">
                  <button
                    onClick={cerrarModalImport}
                    className="px-4 py-2 text-sm text-slate-600 border border-slate-200
                      rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarImportacion}
                    disabled={
                      importLoading
                      || importPreview.errores.length > 0
                      || importPreview.filasPracticas.some(r => r.error)
                    }
                    className="px-5 py-2 text-sm bg-azul hover:bg-azul-oscuro text-white
                      rounded-lg font-medium disabled:opacity-60 flex items-center gap-2"
                  >
                    {importLoading
                      ? <RefreshCw size={14} className="animate-spin" />
                      : <CheckCircle2 size={14} />}
                    Confirmar importación
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// COMPONENTE: Tabla de auditoría de prácticas
// Mismo formato que ConceptoMaestro — columnas: Acción, Fecha,
// Usuario, Origen, Detalle (expandible)
// ══════════════════════════════════════════════════════════════
const LABEL_ACCION_PRACTICA: Record<string, string> = {
  ALTA:            'Alta',
  MODIFICACION:    'Modificación',
  CAMBIO_VIGENCIA: 'Cambio vigencia',
  IMPORTACION:     'Importación',
}

// ── Tabla de auditoría global de prácticas (solapa Auditoría) ─
function AuditTableGlobalPractica({ logs }: { logs: PracticaAuditLog[] }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  const fmtFechaHora = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '—'

  const fmtJson = (obj?: Record<string, unknown>) =>
    obj ? JSON.stringify(obj, null, 2) : '—'

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Acción</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Entidad</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Usuario</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Origen</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Práctica ID</th>
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
                <td className="px-3 py-2 text-slate-500">{fmtFechaHora(log.fechaEvento)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    log.accion === 'ALTA'            ? 'bg-green-100 text-green-700'   :
                    log.accion === 'MODIFICACION'    ? 'bg-blue-100 text-blue-700'     :
                    log.accion === 'CAMBIO_VIGENCIA' ? 'bg-amber-100 text-amber-700'   :
                    log.accion === 'IMPORTACION'     ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {LABEL_ACCION_PRACTICA[log.accion] ?? log.accion}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{log.entidad}</td>
                <td className="px-3 py-2 text-slate-600">{log.usuarioNombre || '—'}</td>
                <td className="px-3 py-2 text-slate-500">{log.origen}</td>
                <td className="px-3 py-2 font-mono text-azul">{log.practicaId}</td>
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
                  <td colSpan={7} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Antes</p>
                        <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[10px]">
                          {fmtJson(log.datosAnteriores)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Después</p>
                        <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[10px]">
                          {fmtJson(log.datosNuevos)}
                        </pre>
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

// ── Tabla de auditoría por práctica (modal historial) ─────────
function AuditTablePractica({ logs }: { logs: PracticaAuditLog[] }) {
  const [expandido, setExpandido] = useState<number | null>(null)

  const fmtFechaHora = (iso?: string) =>
    iso ? new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }) : '—'

  const fmtJson = (obj?: Record<string, unknown>) =>
    obj ? JSON.stringify(obj, null, 2) : '—'

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
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
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    log.accion === 'ALTA'            ? 'bg-green-100 text-green-700'   :
                    log.accion === 'MODIFICACION'    ? 'bg-blue-100 text-blue-700'     :
                    log.accion === 'CAMBIO_VIGENCIA' ? 'bg-amber-100 text-amber-700'   :
                    log.accion === 'IMPORTACION'     ? 'bg-purple-100 text-purple-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {LABEL_ACCION_PRACTICA[log.accion] ?? log.accion}
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
                  <td colSpan={5} className="px-4 py-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Antes</p>
                        <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[10px]">
                          {fmtJson(log.datosAnteriores)}
                        </pre>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">Después</p>
                        <pre className="whitespace-pre-wrap text-slate-500 font-mono text-[10px]">
                          {fmtJson(log.datosNuevos)}
                        </pre>
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
