// ============================================================
// COMPONENT: PracticaDetalle
// Panel accordion que muestra y edita los vínculos
// práctica-concepto-unidad arancel de una práctica.
// Se despliega inline debajo de la fila seleccionada.
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { practicasService } from '../services/practicasService'
import api from '../services/api'
import type {
  PracticaConceptoUnidad,
  CrearEditarPracticaConceptoUnidad,
  ActualizarVigenciaPractica,
  ConceptoMaestroList,
  UnidadArancelList,
} from '../types'
import { Plus, Pencil, X, CheckCircle2, RefreshCw, ChevronDown } from 'lucide-react'

interface Props {
  practicaId:  number;
  readOnly?:   boolean;
}

const FORM_VACIO: CrearEditarPracticaConceptoUnidad = {
  conceptoMaestroId: 0,
  unidadArancelId:   0,
  unidades:          1,
  cantidad:          1,
  vigenciaDesde:     new Date().toISOString().slice(0, 10),
}

// ── Combobox genérico con búsqueda ────────────────────────────
interface ComboboxOption { id: string; label: string }
interface ComboboxProps {
  options:      ComboboxOption[]
  value:        string
  onChange:     (id: string) => void
  placeholder?: string
  disabled?:    boolean
  className?:   string
}

function Combobox({ options, value, onChange, placeholder = 'Seleccionar...', disabled, className = '' }: ComboboxProps) {
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
      <input
        value={inputVal}
        onChange={e => { setInputVal(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 pr-6 text-xs
          focus:outline-none focus:ring-2 focus:ring-azul/30 bg-white disabled:bg-slate-50"
      />
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-44 overflow-y-auto bg-white border border-slate-200
          rounded-lg shadow-lg text-xs">
          {filtered.map(o => (
            <li
              key={o.id}
              onMouseDown={() => { onChange(o.id); setInputVal(o.label); setOpen(false) }}
              className={`px-3 py-1.5 cursor-pointer hover:bg-azul/5
                ${o.id === value ? 'bg-azul/10 font-semibold text-azul' : 'text-slate-700'}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function PracticaDetalle({ practicaId, readOnly }: Props) {
  const qc = useQueryClient()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId,  setEditandoId]  = useState<number | null>(null)
  const [formEditar,  setFormEditar]  = useState<CrearEditarPracticaConceptoUnidad>(FORM_VACIO)
  const [formNuevo,   setFormNuevo]   = useState<CrearEditarPracticaConceptoUnidad>(FORM_VACIO)
  const [vigToggleId, setVigToggleId] = useState<number | null>(null)
  const [error,       setError]       = useState<string | null>(null)

  const { data: detalles = [], isLoading } = useQuery({
    queryKey: ['practica-conceptos', practicaId],
    queryFn:  () => practicasService.listarConceptos(practicaId),
  })

  // Carga conceptos y unidades vigentes directamente desde la API
  const { data: conceptos = [] } = useQuery<ConceptoMaestroList[]>({
    queryKey: ['conceptos-lista'],
    queryFn:  () => api.get('/concepto').then(r => r.data),
  })

  const { data: unidades = [] } = useQuery<UnidadArancelList[]>({
    queryKey: ['unidades-lista'],
    queryFn:  () => api.get('/unidad-arancel').then(r => r.data),
  })

  const crearMutation = useMutation({
    mutationFn: (dto: CrearEditarPracticaConceptoUnidad) =>
      practicasService.crearConcepto(practicaId, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practica-conceptos', practicaId] })
      qc.invalidateQueries({ queryKey: ['practicas'] })
      setMostrarForm(false)
      setFormNuevo(FORM_VACIO)
      setError(null)
    },
    onError: (e: Error) => setError(e.message)
  })

  const editarMutation = useMutation({
    mutationFn: ({ cid, dto }: { cid: number; dto: CrearEditarPracticaConceptoUnidad }) =>
      practicasService.actualizarConcepto(practicaId, cid, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practica-conceptos', practicaId] })
      setEditandoId(null)
      setError(null)
    },
    onError: (e: Error) => setError(e.message)
  })

  const vigenciaMutation = useMutation({
    mutationFn: ({ cid, dto }: { cid: number; dto: ActualizarVigenciaPractica }) =>
      practicasService.vigenciaConcepto(practicaId, cid, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['practica-conceptos', practicaId] })
      qc.invalidateQueries({ queryKey: ['practicas'] })
      setVigToggleId(null)
      setError(null)
    },
    onError: (e: Error) => { setError(e.message); setVigToggleId(null) }
  })

  // Toggle vigencia por chip: Activo → fin=ayer, Inactivo → fin=indefinido
  const toggleVigConcepto = (d: PracticaConceptoUnidad) => {
    setVigToggleId(d.id)
    const ayer = new Date()
    ayer.setDate(ayer.getDate() - 1)
    vigenciaMutation.mutate({
      cid: d.id,
      dto: {
        vigenciaDesde: d.vigenciaDesde,
        vigenciaHasta: d.activo ? ayer.toISOString() : undefined,
      },
    })
  }

  const abrirEditar = (d: PracticaConceptoUnidad) => {
    setEditandoId(d.id)
    setFormEditar({
      conceptoMaestroId: d.conceptoMaestroId,
      unidadArancelId:   d.unidadArancelId,
      unidades:          d.unidades,
      cantidad:          d.cantidad,
      vigenciaDesde:     d.vigenciaDesde.slice(0, 10),
      vigenciaHasta:     d.vigenciaHasta?.slice(0, 10),
    })
    setError(null)
  }

  if (isLoading)
    return <div className="p-4 text-slate-400 text-sm text-center">Cargando detalle...</div>

  const activos   = detalles.filter(d => d.activo)
  const inactivos = detalles.filter(d => !d.activo)

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Conceptos vinculados
        </span>
        {!readOnly && (
          <button
            onClick={() => { setMostrarForm(true); setError(null) }}
            className="flex items-center gap-1.5 text-xs text-azul hover:text-azul-oscuro font-medium"
          >
            <Plus size={14} /> Agregar concepto
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
          {error}
        </div>
      )}

      {/* Formulario nuevo concepto */}
      {mostrarForm && !readOnly && (
        <div className="mb-4 bg-white border border-azul/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-700 mb-3">Nuevo vínculo concepto-arancel</p>
          <FormConcepto
            form={formNuevo}
            setForm={setFormNuevo}
            conceptos={conceptos}
            unidades={unidades}
            onGuardar={() => crearMutation.mutate({
              ...formNuevo,
              vigenciaDesde: new Date(formNuevo.vigenciaDesde).toISOString(),
              vigenciaHasta: formNuevo.vigenciaHasta
                ? new Date(formNuevo.vigenciaHasta).toISOString()
                : undefined,
            })}
            onCancelar={() => { setMostrarForm(false); setError(null) }}
            guardando={crearMutation.isPending}
          />
        </div>
      )}

      {/* Tabla de vínculos activos */}
      {activos.length === 0 && !mostrarForm && (
        <p className="text-slate-400 text-xs text-center py-3">Sin conceptos activos vinculados.</p>
      )}

      {activos.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden mb-3">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-2 text-slate-500 font-semibold">Concepto</th>
                <th className="text-left px-4 py-2 text-slate-500 font-semibold">Unidad Arancel</th>
                <th className="text-right px-4 py-2 text-slate-500 font-semibold">Unidades</th>
                <th className="text-right px-4 py-2 text-slate-500 font-semibold">Cantidad</th>
                <th className="text-left px-4 py-2 text-slate-500 font-semibold">Vigencia</th>
                {!readOnly && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activos.map(d => (
                editandoId === d.id ? (
                  <tr key={d.id} className="bg-blue-50">
                    <td colSpan={6} className="px-4 py-3">
                      <FormConcepto
                        form={formEditar}
                        setForm={setFormEditar}
                        conceptos={conceptos}
                        unidades={unidades}
                        onGuardar={() => editarMutation.mutate({
                          cid: d.id,
                          dto: {
                            ...formEditar,
                            vigenciaDesde: new Date(formEditar.vigenciaDesde).toISOString(),
                            vigenciaHasta: formEditar.vigenciaHasta
                              ? new Date(formEditar.vigenciaHasta).toISOString()
                              : undefined,
                          }
                        })}
                        onCancelar={() => setEditandoId(null)}
                        guardando={editarMutation.isPending}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="bg-azul/10 text-azul font-semibold px-1.5 py-0.5 rounded text-xs">
                          {d.conceptoSigla}
                        </span>
                        <span className="text-slate-600">{d.conceptoNombre}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{d.unidadArancelNombre}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{d.unidades}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{d.cantidad}</td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {d.vigenciaDesde.slice(0, 10)}
                      {d.vigenciaHasta ? ` → ${d.vigenciaHasta.slice(0, 10)}` : ' → ∞'}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1 justify-end items-center">
                          {/* Chip Activo/Inactivo clickeable */}
                          <button
                            onClick={() => toggleVigConcepto(d)}
                            disabled={vigToggleId === d.id}
                            title="Clic para inactivar"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5
                              rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors
                              disabled:opacity-60"
                          >
                            {vigToggleId === d.id
                              ? <RefreshCw size={9} className="animate-spin" />
                              : <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                            Activo
                          </button>
                          <button
                            onClick={() => abrirEditar(d)}
                            className="text-azul hover:bg-azul/10 p-1 rounded"
                            title="Editar"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Históricos */}
      {inactivos.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-600 select-none">
            Ver {inactivos.length} vínculo{inactivos.length > 1 ? 's' : ''} inactivo{inactivos.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 bg-white border border-slate-100 rounded-xl overflow-hidden opacity-70">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-slate-50">
                {inactivos.map(d => (
                  <tr key={d.id} className="text-slate-400">
                    <td className="px-4 py-2">
                      <span className="bg-slate-100 font-semibold px-1.5 py-0.5 rounded">{d.conceptoSigla}</span>
                      {' '}{d.conceptoNombre}
                    </td>
                    <td className="px-4 py-2">{d.unidadArancelNombre}</td>
                    <td className="px-4 py-2 text-right font-mono">{d.unidades}</td>
                    <td className="px-4 py-2 text-right font-mono">{d.cantidad}</td>
                    <td className="px-4 py-2">
                      {d.vigenciaDesde.slice(0, 10)} → {d.vigenciaHasta?.slice(0, 10) ?? '∞'}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-2">
                        <button
                          onClick={() => toggleVigConcepto(d)}
                          disabled={vigToggleId === d.id}
                          title="Clic para reactivar"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5
                            rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors
                            disabled:opacity-60"
                        >
                          {vigToggleId === d.id
                            ? <RefreshCw size={9} className="animate-spin" />
                            : <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                          Inactivo
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}

// ── Sub-formulario para crear/editar vínculo ─────────────────
interface FormConceptoProps {
  form:       CrearEditarPracticaConceptoUnidad;
  setForm:    (f: CrearEditarPracticaConceptoUnidad) => void;
  conceptos:  ConceptoMaestroList[];
  unidades:   UnidadArancelList[];
  onGuardar:  () => void;
  onCancelar: () => void;
  guardando:  boolean;
}

function FormConcepto({ form, setForm, conceptos, unidades, onGuardar, onCancelar, guardando }: FormConceptoProps) {
  const unidadOpts: ComboboxOption[] = unidades
    .filter(u => u.activo)
    .map(u => ({ id: String(u.id), label: u.nombre }))

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="col-span-2 md:col-span-1">
        <label className="block text-xs text-slate-500 mb-1">Concepto *</label>
        <select
          value={form.conceptoMaestroId || ''}
          onChange={e => setForm({ ...form, conceptoMaestroId: Number(e.target.value) })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
        >
          <option value="">Seleccionar...</option>
          {conceptos.filter(c => c.activo).map(c => (
            <option key={c.id} value={c.id}>[{c.sigla}] {c.nombre}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Unidad Arancel *</label>
        <Combobox
          options={unidadOpts}
          value={form.unidadArancelId ? String(form.unidadArancelId) : ''}
          onChange={id => setForm({ ...form, unidadArancelId: Number(id) || 0 })}
          placeholder="Buscar unidad..."
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Unidades *</label>
        <input
          type="number" step="0.0001" min="0"
          value={form.unidades}
          onChange={e => setForm({ ...form, unidades: parseFloat(e.target.value) || 0 })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Cantidad *</label>
        <input
          type="number" step="0.0001" min="0"
          value={form.cantidad}
          onChange={e => setForm({ ...form, cantidad: parseFloat(e.target.value) || 0 })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Vigencia Desde *</label>
        <input
          type="date"
          value={form.vigenciaDesde}
          onChange={e => setForm({ ...form, vigenciaDesde: e.target.value })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Vigencia Hasta</label>
        <input
          type="date"
          value={form.vigenciaHasta ?? ''}
          onChange={e => setForm({ ...form, vigenciaHasta: e.target.value || undefined })}
          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-azul/30"
        />
      </div>
      <div className="col-span-2 md:col-span-2 flex items-end gap-2 justify-end">
        <button
          onClick={onCancelar}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg"
        >
          <X size={12} /> Cancelar
        </button>
        <button
          onClick={onGuardar}
          disabled={guardando || !form.conceptoMaestroId || !form.unidadArancelId}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-azul hover:bg-azul-oscuro text-white rounded-lg disabled:opacity-60"
        >
          <CheckCircle2 size={12} /> {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
