// ============================================================
// VALORES — Importador / Matriz / Historial
// Gestión de valores económicos por obra social:
//   · Importador: sube Excel del proveedor, compara, aplica a planes
//   · Matriz:     tabla planes × prácticas con mapa de calor
//   · Historial:  evolución de valores por fecha de importación
// ============================================================

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp, Building2, Upload, CheckCircle2, AlertCircle,
  ChevronUp, ChevronDown, Sparkles, BarChart2, History,
  RefreshCw, FileSpreadsheet, PackageOpen, Settings, CircleSlash,
  ChevronRight,
} from 'lucide-react'
import { valoresService } from '../services/valoresService'
import { planesService  } from '../services/planesService'
import type {
  ParsearImportacionResponse,
  AplicarImportacionResponse,
  MatrizResponse,
  HistorialResponse,
  HistorialPlanItem,
  ImportacionValores,
} from '../types'

// ── Formateador de moneda argentina ──────────────────────────
const fmt = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

// ── Config visual por estado de comparación ──────────────────
const ESTADO_CFG = {
  mayor: { label: '↑ Mayor',  badge: 'bg-amber-100 text-amber-700',  row: 'bg-amber-50/40' },
  menor: { label: '↓ Menor',  badge: 'bg-sky-100 text-sky-700',      row: 'bg-sky-50/40'   },
  igual: { label: '= Igual',  badge: 'bg-slate-100 text-slate-500',  row: ''               },
  nuevo: { label: '★ Nueva',  badge: 'bg-violet-100 text-violet-700', row: 'bg-violet-50/30'},
} as const

// ── Heatmap para Matriz ───────────────────────────────────────
// Compara el valor de cada celda contra el mínimo/máximo de la fila
function clsMatriz(val: number | null, rowVals: (number | null)[]): string {
  if (val === null) return 'text-center text-slate-200'
  const nums = rowVals.filter((v): v is number => v !== null)
  if (nums.length <= 1) return 'text-right'
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  if (max === min) return 'text-right'
  const norm = (val - min) / (max - min)
  if (norm > 0.66) return 'bg-amber-50 text-amber-800 font-medium text-right'
  if (norm < 0.34) return 'bg-sky-50 text-sky-800 text-right'
  return 'text-right'
}

// ── Heatmap para Historial ────────────────────────────────────
// Compara con el período anterior: sube = verde, baja = rojo
function clsHist(val: number | null, prev: number | null): string {
  if (val === null) return 'text-center text-slate-200'
  if (prev === null) return 'text-right'
  if (val > prev * 1.001) return 'bg-green-50 text-green-700 text-right'
  if (val < prev * 0.999) return 'bg-red-50 text-red-700 text-right'
  return 'text-right'
}

// ── Tipo interno para configuración de planes ─────────────────
interface PlanCfg { planId: number; nombre: string; sel: boolean; ajuste: string }

// ══════════════════════════════════════════════════════════════
// Componente principal
// ══════════════════════════════════════════════════════════════
export default function Valores() {
  const [searchParams]     = useSearchParams()
  const obraSocialId       = parseInt(searchParams.get('obraSocialId') || '0')
  const obraSocialNombre   = searchParams.get('obraSocialNombre') || ''
  const qc                 = useQueryClient()

  const [tab, setTab]      = useState<'importador' | 'matriz' | 'historial'>('importador')

  // ── Estado del Importador ─────────────────────────────────
  const fileRef                           = useRef<HTMLInputElement>(null)
  const [archivo, setArchivo]             = useState<File | null>(null)
  const [vigencia, setVigencia]           = useState('')
  const [parseando, setParseando]         = useState(false)
  const [parseError, setParseError]       = useState<string | null>(null)
  const [result, setResult]               = useState<ParsearImportacionResponse | null>(null)
  const [filtroE, setFiltroE]             = useState<string>('todos')
  const [planCfg, setPlanCfg]             = useState<PlanCfg[]>([])
  const [aplicando, setAplicando]         = useState(false)
  const [aplResult, setAplResult]         = useState<AplicarImportacionResponse | null>(null)
  const [aplError, setAplError]           = useState<string | null>(null)

  // ── Estado del editor ETL ─────────────────────────────
  const [etlEditorOpen, setEtlEditorOpen] = useState(false)
  const [etlConfigStr, setEtlConfigStr]   = useState('')
  const [etlJsonError, setEtlJsonError]   = useState<string | null>(null)
  // ── Estado del visor de filas excluidas ───────────────
  const [excluidasOpen, setExcluidasOpen] = useState(false)

  // ── Historial: planes abiertos (collapsible) ──────────
  const [openPlanes, setOpenPlanes] = useState<Set<number>>(new Set())
  const togglePlan = (id: number) =>
    setOpenPlanes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ── Planes de la OS (para la selección al aplicar) ────────
  const { data: planes } = useQuery({
    queryKey: ['planes-os', obraSocialId],
    queryFn:  () => planesService.listar({ obraSocialId }),
    enabled:  !!obraSocialId,
  })

  useEffect(() => {
    if (planes) {
      setPlanCfg(planes.map(p => ({ planId: p.id, nombre: p.nombre, sel: true, ajuste: '0' })))
    }
  }, [planes])

  // Sincronizar configUsada → editor cuando llega el resultado del ETL
  useEffect(() => {
    if (result?.configUsada) {
      setEtlConfigStr(JSON.stringify(result.configUsada, null, 2))
      setEtlJsonError(null)
    }
  }, [result?.configUsada])

  // ── Importaciones anteriores ──────────────────────────────
  const { data: importsPast, refetch: refetchPast } = useQuery({
    queryKey: ['val-imports', obraSocialId],
    queryFn:  () => valoresService.listarImportaciones(obraSocialId),
    enabled:  !!obraSocialId,
  })

  // ── Matriz ────────────────────────────────────────────────
  const { data: matrizData, isLoading: matrizLoad } = useQuery({
    queryKey: ['val-matriz', obraSocialId],
    queryFn:  () => valoresService.obtenerMatriz(obraSocialId),
    enabled:  tab === 'matriz' && !!obraSocialId,
  })

  // ── Historial ─────────────────────────────────────────────
  const { data: histData, isLoading: histLoad } = useQuery({
    queryKey: ['val-hist', obraSocialId],
    queryFn:  () => valoresService.obtenerHistorial(obraSocialId),
    enabled:  tab === 'historial' && !!obraSocialId,
  })

  // ── Cálculo de estadísticas para el gráfico de Historial ──
  const histStats = useMemo(() => {
    if (!histData?.periodos?.length || histData.periodos.length < 2) return []

    const currentYearStart = new Date(`${new Date().getFullYear()}-01-01`)

    // Último índice cuya vigencia es ≤ 1-ene del año en curso → base acumulado
    let baseIdx = 0
    histData.periodos.forEach((p, i) => {
      if (new Date(p) <= currentYearStart) baseIdx = i
    })

    // Variación promedio entre planes para cada período
    const avgDeltas: (number | null)[] = histData.periodos.map((_, i) => {
      if (i === 0) return null
      // Promediamos las variaciones promedio de cada plan (que el backend ya calculó)
      const planVars = histData.planes
        .map(pl => pl.variacionPromedio[i])
        .filter((v): v is number => v != null)
      return planVars.length > 0
        ? parseFloat((planVars.reduce((a, b) => a + b, 0) / planVars.length).toFixed(2))
        : null
    })

    // Acumulado compuesto desde la base (1-ene del año en curso)
    let cumFactor = 1
    const cumValues: (number | null)[] = histData.periodos.map((_, i) => {
      if (i < baseIdx) return null
      if (i === baseIdx) { cumFactor = 1; return 0 }
      const d = avgDeltas[i]
      if (d != null) cumFactor *= (1 + d / 100)
      return parseFloat(((cumFactor - 1) * 100).toFixed(2))
    })

    return histData.periodos
      .map((label, i) => ({ label, avgDelta: avgDeltas[i], cumBase: cumValues[i] }))
      .slice(-13)
  }, [histData])

  // ── Handlers ──────────────────────────────────────────────

  const handleFile = (f: File | null) => {
    setArchivo(f)
    setResult(null)
    setParseError(null)
    setAplResult(null)
    setAplError(null)
  }

  const handleParsear = async (customEtlConfig?: string) => {
    if (!archivo || !vigencia || !obraSocialId) return
    setParseando(true)
    setParseError(null)
    try {
      const r = await valoresService.parsear(obraSocialId, archivo, vigencia, customEtlConfig)
      setResult(r)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { mensaje?: string } } }
      setParseError(err?.response?.data?.mensaje ?? 'Error al procesar el archivo.')
    } finally {
      setParseando(false)
    }
  }

  const handleReanalizar = () => {
    setEtlJsonError(null)
    try {
      JSON.parse(etlConfigStr)
    } catch {
      setEtlJsonError('JSON inválido — revisá la sintaxis antes de re-analizar.')
      return
    }
    handleParsear(etlConfigStr)
  }

  const restaurarDefaults = () => {
    const defaults = {
      filaEncabezado:   6,
      filasDatoDesde:   7,
      colCodigoExterno: 1,
      colCodigo:        2,
      colDescripcion:   3,
      colValor:         'ultima',
      prefijoColfin:    'OBSERV',
      omitirCodVacio:   true,
      omitirValorCero:  false,
    }
    setEtlConfigStr(JSON.stringify(defaults, null, 2))
    setEtlJsonError(null)
  }

  const handleAplicar = async () => {
    if (!result) return
    const selPlanes = planCfg.filter(p => p.sel)
    if (!selPlanes.length) return
    setAplicando(true)
    setAplError(null)
    try {
      const r = await valoresService.aplicar({
        importacionId: result.importacionId,
        planes: selPlanes.map(p => ({
          planId:           p.planId,
          ajustePorcentaje: parseFloat(p.ajuste) || 0,
        })),
      })
      setAplResult(r)
      refetchPast()
      qc.invalidateQueries({ queryKey: ['val-matriz',   obraSocialId] })
      qc.invalidateQueries({ queryKey: ['val-hist',     obraSocialId] })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { mensaje?: string } } }
      setAplError(err?.response?.data?.mensaje ?? 'Error al aplicar la importación.')
    } finally {
      setAplicando(false)
    }
  }

  const resetImportador = () => {
    setArchivo(null); setResult(null); setAplResult(null)
    setParseError(null); setAplError(null); setVigencia('')
    setEtlConfigStr(''); setEtlJsonError(null)
    setEtlEditorOpen(false); setExcluidasOpen(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Conteos para filtros de tabla ─────────────────────────
  const conteo = result
    ? {
        todos:  result.items.length,
        mayor:  result.items.filter(i => i.estado === 'mayor').length,
        menor:  result.items.filter(i => i.estado === 'menor').length,
        igual:  result.items.filter(i => i.estado === 'igual').length,
        nuevo:  result.items.filter(i => i.estado === 'nuevo').length,
      }
    : null

  const itemsFiltrados = result
    ? (filtroE === 'todos' ? result.items : result.items.filter(i => i.estado === filtroE))
    : []

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Valores</h1>
          {obraSocialNombre
            ? <div className="flex items-center gap-1.5 text-sm text-azul font-medium mt-0.5">
                <Building2 size={13} />{obraSocialNombre}
              </div>
            : <p className="text-sm text-slate-400 mt-0.5">Sin obra social seleccionada</p>
          }
        </div>
      </div>

      {/* Aviso cuando no hay OS en contexto */}
      {!obraSocialId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Ninguna obra social seleccionada</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Para usar esta sección ingresá desde{' '}
              <a href="/configuracion-obra-social" className="underline font-medium hover:text-amber-900">
                Configuración OS
              </a>
              , buscá la obra social y hacé click en la card <strong>Valores</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {([
          { id: 'importador', label: 'Importador', Icon: Upload     },
          { id: 'matriz',     label: 'Matriz',     Icon: BarChart2  },
          { id: 'historial',  label: 'Historial',  Icon: History    },
        ] as const).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white text-azul shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          TAB: IMPORTADOR
      ════════════════════════════════════════════════════ */}
      {tab === 'importador' && (
        <div className="space-y-4">

          {/* Resultado exitoso */}
          {aplResult && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-3">
                  <CheckCircle2 size={22} className="text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-800">Importación aplicada con éxito</p>
                    <p className="text-sm text-green-700 mt-1">
                      {aplResult.codigosAplicados} códigos actualizados en {aplResult.planesActualizados} plan
                      {aplResult.planesActualizados !== 1 ? 'es' : ''}.
                      {aplResult.practicasCreadas > 0 && ` ${aplResult.practicasCreadas} prácticas nuevas creadas.`}
                    </p>
                    {aplResult.advertencias.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {aplResult.advertencias.map((a, i) => (
                          <p key={i} className="text-xs text-amber-700 flex items-start gap-1">
                            <AlertCircle size={11} className="flex-shrink-0 mt-0.5" />{a}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={resetImportador}
                  className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-900 font-medium flex-shrink-0"
                >
                  <RefreshCw size={14} />Nueva importación
                </button>
              </div>
            </div>
          )}

          {/* Paso 1: Selección de archivo y fecha */}
          {!result && !aplResult && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <FileSpreadsheet size={15} className="text-emerald-500" />
                Cargar archivo del proveedor
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Selector de archivo */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Archivo Excel (.xlsx)</p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                      archivo
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}
                  >
                    <Upload size={20} className={`mx-auto mb-1.5 ${archivo ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <p className="text-xs text-slate-600 font-medium">
                      {archivo ? archivo.name : 'Click para seleccionar'}
                    </p>
                    {archivo
                      ? <p className="text-[10px] text-slate-400 mt-0.5">{(archivo.size / 1024).toFixed(0)} KB</p>
                      : <p className="text-[10px] text-slate-400 mt-0.5">Formato Geclisa / Avalian</p>
                    }
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={e => handleFile(e.target.files?.[0] ?? null)}
                  />
                </div>

                {/* Fecha de vigencia */}
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Fecha de vigencia</p>
                  <input
                    type="date"
                    value={vigencia}
                    onChange={e => setVigencia(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">
                    Desde qué fecha rigen los nuevos valores cargados
                  </p>
                </div>
              </div>

              {parseError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{parseError}</p>
                </div>
              )}

              <button
                onClick={() => handleParsear()}
                disabled={!archivo || !vigencia || parseando || !obraSocialId}
                className="mt-4 px-5 py-2.5 bg-azul hover:bg-azul-oscuro disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {parseando
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analizando...</>
                  : <><Sparkles size={14} />Analizar archivo</>
                }
              </button>
            </div>
          )}

          {/* Paso 2: Resultado del ETL + comparación */}
          {result && !aplResult && (
            <>
              {/* Pasos del ETL */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Procesamiento del archivo
                </h3>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total filas',  val: result.totalFilas,     color: 'text-slate-700'   },
                    { label: 'Prácticas',    val: result.filasValidas,   color: 'text-emerald-600' },
                    { label: 'Omitidas',     val: result.filasIgnoradas, color: 'text-slate-400'   },
                    { label: 'Nuevas',       val: conteo!.nuevo,         color: 'text-violet-600'  },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Pasos en lenguaje natural */}
                <div className="space-y-1.5">
                  {result.etlPasos.map((paso, i) => (
                    <p key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <span className="text-emerald-500 flex-shrink-0 mt-0.5">✓</span>
                      {paso}
                    </p>
                  ))}
                </div>

                {/* ── Editor de configuración ETL ──────────────── */}
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setEtlEditorOpen(v => !v)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors w-full text-left"
                  >
                    <Settings size={13} className="text-slate-400" />
                    Configuración ETL usada
                    <ChevronRight
                      size={13}
                      className={`ml-auto transition-transform ${etlEditorOpen ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {etlEditorOpen && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Este JSON controla cómo se lee el Excel. Editalo y hacé clic en{' '}
                        <strong className="text-slate-500">Re-analizar</strong> para aplicar
                        los cambios sin modificar código.
                      </p>
                      <textarea
                        value={etlConfigStr}
                        onChange={e => { setEtlConfigStr(e.target.value); setEtlJsonError(null) }}
                        rows={12}
                        spellCheck={false}
                        className={`w-full text-xs font-mono bg-slate-950 text-emerald-300 rounded-xl p-4 resize-y focus:outline-none focus:ring-2 transition-all ${
                          etlJsonError ? 'ring-2 ring-red-400' : 'focus:ring-azul/30'
                        }`}
                      />
                      {etlJsonError && (
                        <p className="text-xs text-red-500 flex items-center gap-1.5">
                          <AlertCircle size={12} />{etlJsonError}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={handleReanalizar}
                          disabled={parseando}
                          className="px-4 py-2 bg-azul hover:bg-azul-oscuro disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          {parseando
                            ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Re-analizando...</>
                            : <><RefreshCw size={12} />Re-analizar con esta config</>
                          }
                        </button>
                        <button
                          onClick={restaurarDefaults}
                          className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Restaurar defaults
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Filas anuladas (excluidas por ETL) ──────────── */}
              {(result.filasExcluidas?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <button
                    onClick={() => setExcluidasOpen(v => !v)}
                    className="w-full flex items-center gap-2 px-5 py-4 text-left"
                  >
                    <CircleSlash size={14} className="text-rose-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700">
                      Filas anuladas durante el procesamiento
                    </span>
                    <span className="ml-1 bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {result.filasExcluidas?.length ?? 0}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`ml-auto text-slate-400 transition-transform ${excluidasOpen ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {excluidasOpen && (
                    <div className="border-t border-slate-50">
                      <p className="px-5 py-2 text-[11px] text-slate-400">
                        Estas filas del Excel fueron detectadas pero no incorporadas al resultado.
                        No se pierde ningún dato — todo queda visible acá con su motivo.
                      </p>
                      <div className="overflow-auto max-h-64">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                            <tr className="text-left text-slate-500">
                              <th className="px-3 py-2 font-medium w-12">Fila</th>
                              <th className="px-3 py-2 font-medium w-28">Código</th>
                              <th className="px-3 py-2 font-medium">Contenido</th>
                              <th className="px-3 py-2 font-medium w-40">Motivo</th>
                              <th className="px-3 py-2 font-medium w-20">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(result.filasExcluidas ?? []).map((fila, i) => (
                              <tr key={i} className="hover:bg-rose-50/30">
                                <td className="px-3 py-2 text-slate-400 font-mono">{fila.numeroFila}</td>
                                <td className="px-3 py-2 font-mono text-slate-600">{fila.codigo || <span className="text-slate-300 italic">vacío</span>}</td>
                                <td className="px-3 py-2 text-slate-600 max-w-[280px] truncate">{fila.descripcion}</td>
                                <td className="px-3 py-2 text-slate-500">{fila.motivo}</td>
                                <td className="px-3 py-2">
                                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-bold rounded">
                                    ANULADO
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
              )}

              {/* Tabla de comparación */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="px-4 pt-4 pb-3 border-b border-slate-50 flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-700 mr-1">Comparación de valores</h3>
                  {(['todos', 'mayor', 'menor', 'igual', 'nuevo'] as const).map(e => {
                    const count = e === 'todos' ? conteo!.todos : conteo![e]
                    const label = e === 'todos' ? `Todos (${count})` : `${ESTADO_CFG[e].label} (${count})`
                    return (
                      <button
                        key={e}
                        onClick={() => setFiltroE(e)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          filtroE === e ? 'bg-azul text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                <div className="overflow-auto max-h-80">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="text-slate-500 text-left border-b border-slate-100">
                        <th className="px-3 py-2.5 font-medium">Código</th>
                        <th className="px-3 py-2.5 font-medium">Descripción</th>
                        <th className="px-3 py-2.5 font-medium text-right">Anterior</th>
                        <th className="px-3 py-2.5 font-medium text-right">Nuevo</th>
                        <th className="px-3 py-2.5 font-medium text-right">Dif. %</th>
                        <th className="px-3 py-2.5 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {itemsFiltrados.map(item => {
                        const cfg = ESTADO_CFG[item.estado]
                        return (
                          <tr key={item.codigoPractica} className={`${cfg.row} hover:bg-slate-50/80`}>
                            <td className="px-3 py-2 font-mono text-slate-700">{item.codigoPractica}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[260px] truncate">{item.descripcion}</td>
                            <td className="px-3 py-2 text-right text-slate-400">{fmt(item.valorActual)}</td>
                            <td className="px-3 py-2 text-right font-medium text-slate-800">{fmt(item.valorNuevo)}</td>
                            <td className="px-3 py-2 text-right">
                              {item.diferenciaPorcentaje != null
                                ? <span className={`font-medium ${
                                    item.estado === 'mayor' ? 'text-amber-600' :
                                    item.estado === 'menor' ? 'text-sky-600'  : 'text-slate-400'
                                  }`}>
                                    {item.diferenciaPorcentaje > 0 ? '+' : ''}{item.diferenciaPorcentaje.toFixed(1)}%
                                  </span>
                                : '—'
                              }
                            </td>
                            <td className="px-3 py-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paso 3: Selección de planes */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Asignar a planes</h3>
                <p className="text-xs text-slate-400 mb-1">
                  Seleccioná los planes a actualizar y definí el ajuste porcentual respecto al valor de referencia importado.
                </p>
                <div className="flex items-center gap-4 mb-4 text-[11px]">
                  <span className="flex items-center gap-1 text-amber-600 font-medium">
                    <ChevronUp size={12} />Positivo (+%) = por encima del valor de referencia
                  </span>
                  <span className="flex items-center gap-1 text-sky-600 font-medium">
                    <ChevronDown size={12} />Negativo (−%) = por debajo del valor de referencia
                  </span>
                </div>

                {planes && planes.length > 0 ? (
                  <div className="space-y-2">
                    {planCfg.map((cfg, idx) => {
                      const ajusteNum = parseFloat(cfg.ajuste) || 0
                      const esPositivo = ajusteNum > 0
                      const esNegativo = ajusteNum < 0
                      return (
                        <div
                          key={cfg.planId}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                            !cfg.sel
                              ? 'bg-slate-50/40 border-transparent opacity-50'
                              : esPositivo
                                ? 'bg-amber-50/40 border-amber-100'
                                : esNegativo
                                  ? 'bg-sky-50/40 border-sky-100'
                                  : 'bg-slate-50 border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            id={`plan-${cfg.planId}`}
                            checked={cfg.sel}
                            onChange={e => setPlanCfg(prev =>
                              prev.map((p, i) => i === idx ? { ...p, sel: e.target.checked } : p)
                            )}
                            className="w-4 h-4 rounded accent-azul cursor-pointer flex-shrink-0"
                          />
                          <label htmlFor={`plan-${cfg.planId}`} className="flex-1 text-sm text-slate-700 cursor-pointer min-w-0 truncate">
                            {cfg.nombre}
                          </label>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="relative flex items-center">
                              <input
                                type="number"
                                step="0.1"
                                value={cfg.ajuste}
                                onChange={e => setPlanCfg(prev =>
                                  prev.map((p, i) => i === idx ? { ...p, ajuste: e.target.value } : p)
                                )}
                                disabled={!cfg.sel}
                                className={`w-24 pl-3 pr-7 py-1.5 text-xs border rounded-lg text-right focus:outline-none focus:ring-1 disabled:bg-slate-100 disabled:text-slate-300 transition-colors ${
                                  esPositivo ? 'border-amber-200 focus:ring-amber-300 bg-amber-50/60 text-amber-700 font-semibold' :
                                  esNegativo ? 'border-sky-200 focus:ring-sky-300 bg-sky-50/60 text-sky-700 font-semibold' :
                                  'border-slate-200 focus:ring-azul/30'
                                }`}
                              />
                              <span className="absolute right-2.5 text-xs text-slate-400 pointer-events-none">%</span>
                            </div>
                            <span className={`text-[10px] font-semibold w-28 text-right ${
                              esPositivo ? 'text-amber-600' : esNegativo ? 'text-sky-600' : 'text-slate-300'
                            }`}>
                              {esPositivo
                                ? `↑ +${ajusteNum.toFixed(1)}% por encima`
                                : esNegativo
                                  ? `↓ ${ajusteNum.toFixed(1)}% por debajo`
                                  : '= sin ajuste'
                              }
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">
                    No hay planes activos para esta obra social.
                  </p>
                )}

                {aplError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{aplError}</p>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleAplicar}
                    disabled={aplicando || !planCfg.some(p => p.sel)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                  >
                    {aplicando
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Aplicando...</>
                      : <><CheckCircle2 size={14} />Aplicar importación</>
                    }
                  </button>
                  <button
                    onClick={resetImportador}
                    className="px-4 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-sm rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Importaciones anteriores */}
          {importsPast && importsPast.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <History size={14} className="text-slate-400" />
                Importaciones anteriores
              </h3>
              <div className="space-y-2">
                {importsPast.map((imp: ImportacionValores) => (
                  <div key={imp.id} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl">
                    <FileSpreadsheet size={13} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 font-medium truncate">{imp.nombreArchivo}</p>
                      <p className="text-[10px] text-slate-400">
                        Subido el {new Date(imp.fechaCreacion).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">desde {imp.vigenciaDesde}</span>
                    <span className="text-xs text-slate-500">{imp.cantidadItems} códigos</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      imp.aplicada
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {imp.aplicada ? 'Aplicada' : 'Pendiente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: MATRIZ
      ════════════════════════════════════════════════════ */}
      {tab === 'matriz' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {matrizLoad ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-azul border-t-transparent rounded-full animate-spin" />
              Cargando matriz...
            </div>
          ) : !matrizData?.practicas?.length ? (
            <div className="p-14 text-center">
              <PackageOpen size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Sin valores cargados</p>
              <p className="text-slate-300 text-xs mt-1">
                Usá el Importador para cargar valores desde un archivo Excel.
              </p>
            </div>
          ) : (
            <>
              {/* Resumen de cobertura por plan */}
              <div className="px-4 pt-4 pb-3 border-b border-slate-50 flex flex-wrap items-center gap-x-5 gap-y-1">
                <span className="text-xs font-semibold text-slate-600">
                  {matrizData.practicas.length} prácticas totales
                </span>
                {matrizData.planes.map((p, pi) => {
                  const cnt = matrizData.practicas.filter(pr => pr.valores[pi] != null).length
                  return (
                    <span key={p.id} className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{p.nombre}:</span>&nbsp;
                      {cnt}/{matrizData.practicas.length} valorizadas
                    </span>
                  )
                })}
              </div>

              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#e2e8f0]">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2.5 font-medium sticky left-0 bg-white z-20 min-w-[90px] border-r border-slate-100">
                        Código
                      </th>
                      <th className="px-3 py-2.5 font-medium sticky left-[90px] bg-white z-20 min-w-[220px] border-r border-slate-100">
                        Descripción
                      </th>
                      {matrizData.planes.map(p => (
                        <th key={p.id} className="px-3 py-2.5 font-medium text-right min-w-[115px]">
                          {p.nombre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {matrizData.practicas.map(prac => (
                      <tr key={prac.codigo} className="hover:bg-slate-50/70">
                        <td className="px-3 py-2 font-mono text-slate-700 sticky left-0 bg-white border-r border-slate-50">
                          {prac.codigo}
                        </td>
                        <td className="px-3 py-2 text-slate-600 sticky left-[90px] bg-white border-r border-slate-50 max-w-[220px] truncate">
                          {prac.descripcion}
                        </td>
                        {prac.valores.map((v, vi) => (
                          <td key={vi} className={`px-3 py-2 ${clsMatriz(v, prac.valores)}`}>
                            {v != null ? fmt(v) : <span className="text-slate-200">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div className="px-4 py-2 border-t border-slate-50 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-100 inline-block" />
                  Valor más alto en la fila
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-sky-100 inline-block" />
                  Valor más bajo en la fila
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-slate-200">—</span>
                  &nbsp;Sin valor asignado
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TAB: HISTORIAL
      ════════════════════════════════════════════════════ */}
      {tab === 'historial' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          {histLoad ? (
            <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-azul border-t-transparent rounded-full animate-spin" />
              Cargando historial...
            </div>
          ) : !histData?.planes?.length ? (
            <div className="p-14 text-center">
              <History size={36} className="mx-auto text-slate-200 mb-3" />
              <p className="text-slate-400 text-sm font-medium">Sin historial disponible</p>
              <p className="text-slate-300 text-xs mt-1">
                Aquí se mostrarán las variaciones entre importaciones una vez que apliques la primera.
              </p>
            </div>
          ) : (
            <>
              {/* ── Gráfico de variación e incremento acumulado ── */}
              {histStats.length >= 2 && (
                <div className="px-5 pt-5 pb-4 border-b border-slate-50">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Evolución de valores</h3>
                  </div>

                  {/* ── Gráfico SVG puro ─────────────────────────── */}
                  {(() => {
                    const W = 720, H = 180
                    const PAD = { top: 16, right: 56, bottom: 32, left: 48 }
                    const innerW = W - PAD.left - PAD.right
                    const innerH = H - PAD.top - PAD.bottom

                    const barVals  = histStats.map(s => s.avgDelta ?? 0)
                    const lineVals = histStats.map(s => s.cumBase)

                    const barMax  = Math.max(Math.abs(Math.max(...barVals)), Math.abs(Math.min(...barVals)), 1)
                    const lineMax = Math.max(...lineVals.filter((v): v is number => v != null).map(Math.abs), 1)

                    const n   = histStats.length
                    const bW  = Math.min(32, (innerW / n) * 0.6)
                    const xOf = (i: number) => PAD.left + (i + 0.5) * (innerW / n)

                    // Bar y: 0-line at center, scale ±barMax → ±innerH/2
                    const zeroY   = PAD.top + innerH / 2
                    const barY    = (v: number) => zeroY - (v / barMax) * (innerH / 2)

                    // Line y: maps lineVals to [PAD.top+4 .. PAD.top+innerH-4]
                    const lineY   = (v: number) => PAD.top + 4 + (1 - (v + lineMax) / (2 * lineMax)) * (innerH - 8)

                    const linePoints = histStats
                      .map((s, i) => s.cumBase != null ? `${xOf(i)},${lineY(s.cumBase)}` : null)
                      .filter(Boolean)

                    const ultVar = histStats.slice().reverse().find(s => s.avgDelta != null)?.avgDelta
                    const cumAct = histStats[histStats.length - 1]?.cumBase

                    return (
                      <>
                        {/* KPIs */}
                        <div className="flex flex-wrap gap-3 mb-3">
                          {ultVar != null && (
                            <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
                              <p className={`text-xl font-bold ${ultVar >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {ultVar >= 0 ? '+' : ''}{ultVar.toFixed(2)}%
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Última variación</p>
                            </div>
                          )}
                          {cumAct != null && (
                            <div className="bg-amber-50 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
                              <p className={`text-xl font-bold ${cumAct >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                {cumAct >= 0 ? '+' : ''}{cumAct.toFixed(2)}%
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Acumulado {new Date().getFullYear()}</p>
                            </div>
                          )}
                          <div className="bg-slate-50 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
                            <p className="text-xl font-bold text-slate-700">
                              {histData?.planes?.reduce((acc, pl) => acc + pl.practicas.length, 0) ?? 0}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Códigos con historial</p>
                          </div>
                        </div>

                        {/* SVG */}
                        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
                          {/* Grid horizontal */}
                          {[-1, -0.5, 0, 0.5, 1].map(f => (
                            <line key={f} x1={PAD.left} x2={W - PAD.right}
                              y1={PAD.top + (1 - (f + 1) / 2) * innerH}
                              y2={PAD.top + (1 - (f + 1) / 2) * innerH}
                              stroke="#f1f5f9" strokeWidth={1} />
                          ))}

                          {/* Zero line */}
                          <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY}
                            stroke="#cbd5e1" strokeWidth={1} />

                          {/* Barras variación */}
                          {histStats.map((s, i) => {
                            if (s.avgDelta == null) return null
                            const x  = xOf(i) - bW / 2
                            const y0 = zeroY
                            const y1 = barY(s.avgDelta)
                            return (
                              <g key={i}>
                                <rect
                                  x={x} y={Math.min(y0, y1)}
                                  width={bW} height={Math.abs(y0 - y1) || 1}
                                  rx={3} fill={s.avgDelta >= 0 ? '#86efac' : '#fca5a5'}
                                />
                                <title>{`${s.label}: ${s.avgDelta >= 0 ? '+' : ''}${s.avgDelta.toFixed(2)}%`}</title>
                              </g>
                            )
                          })}

                          {/* Línea acumulado */}
                          {linePoints.length >= 2 && (
                            <polyline
                              points={linePoints.join(' ')}
                              fill="none" stroke="#f59e0b" strokeWidth={2}
                            />
                          )}
                          {histStats.map((s, i) =>
                            s.cumBase != null ? (
                              <circle key={i} cx={xOf(i)} cy={lineY(s.cumBase)} r={3} fill="#f59e0b">
                                <title>{`${s.label}: acum. ${s.cumBase >= 0 ? '+' : ''}${s.cumBase.toFixed(2)}%`}</title>
                              </circle>
                            ) : null
                          )}

                          {/* Eje X — etiquetas */}
                          {histStats.map((s, i) => (
                            <text key={i} x={xOf(i)} y={H - 6}
                              textAnchor="middle" fontSize={9} fill="#94a3b8">
                              {s.label.slice(0, 7)}
                            </text>
                          ))}

                          {/* Eje Y izquierdo */}
                          {[-barMax, 0, barMax].map(v => (
                            <text key={v} x={PAD.left - 4} y={barY(v) + 3}
                              textAnchor="end" fontSize={9} fill="#94a3b8">
                              {v >= 0 ? '+' : ''}{v.toFixed(0)}%
                            </text>
                          ))}

                          {/* Eje Y derecho — acumulado */}
                          {[-lineMax, 0, lineMax].map(v => (
                            <text key={v} x={W - PAD.right + 4} y={lineY(v) + 3}
                              textAnchor="start" fontSize={9} fill="#f59e0b">
                              {v >= 0 ? '+' : ''}{v.toFixed(0)}%
                            </text>
                          ))}
                        </svg>

                        {/* Leyenda */}
                        <div className="flex items-center gap-5 mt-1 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-green-300 inline-block" />
                            Var. promedio vs período anterior
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-0.5 bg-amber-400 inline-block rounded" />
                            Acumulado vs 1-ene-{new Date().getFullYear()}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* ── Tabla agrupada por plan ──────────────────────── */}
              <div className="overflow-auto max-h-[60vh]">
                <table className="w-full text-xs border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#e2e8f0]">
                    <tr className="text-left text-slate-500">
                      <th className="px-3 py-2.5 font-medium sticky left-0 bg-white z-20 min-w-[310px] border-r border-slate-100" colSpan={2}>
                        Plan / Código — Descripción
                      </th>
                      {(histData?.periodos ?? []).map(p => (
                        <th key={p} className="px-3 py-2.5 font-medium text-right min-w-[115px]">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(histData?.planes ?? []).map((plan: HistorialPlanItem) => {
                      const isOpen = openPlanes.has(plan.id)
                      return (
                        <>
                          {/* ── Fila cabecera del plan ── */}
                          <tr
                            key={`plan-${plan.id}`}
                            onClick={() => togglePlan(plan.id)}
                            className="cursor-pointer bg-slate-50 hover:bg-slate-100 border-y border-slate-100 select-none"
                          >
                            <td className="px-3 py-2.5 sticky left-0 bg-slate-50 font-semibold text-slate-700 min-w-[310px] border-r border-slate-100"
                                colSpan={2}>
                              <div className="flex items-center gap-2">
                                <ChevronRight
                                  size={13}
                                  className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                                />
                                <span>{plan.nombre}</span>
                                <span className="text-[10px] font-normal text-slate-400 ml-1">
                                  {plan.practicas.length} código{plan.practicas.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </td>
                            {plan.variacionPromedio.map((vp, vi) => (
                              <td key={vi} className="px-3 py-2.5 text-right">
                                {vp != null ? (
                                  <span className={`font-semibold text-xs px-1.5 py-0.5 rounded ${
                                    vp > 0 ? 'bg-green-100 text-green-700' :
                                    vp < 0 ? 'bg-red-100 text-red-600'   : 'text-slate-400'
                                  }`}>
                                    {vp > 0 ? '+' : ''}{vp.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            ))}
                          </tr>

                          {/* ── Detalle de prácticas (colapsable) ── */}
                          {isOpen && plan.practicas.map(prac => (
                            <tr key={`${plan.id}-${prac.codigo}`} className="hover:bg-slate-50/70 border-b border-slate-50">
                              <td className="pl-8 pr-2 py-2 font-mono text-slate-500 sticky left-0 bg-white min-w-[90px] border-r border-slate-50 w-[90px]">
                                {prac.codigo}
                              </td>
                              <td className="px-2 py-2 text-slate-600 sticky left-[90px] bg-white border-r border-slate-50 max-w-[220px] truncate">
                                {prac.descripcion}
                              </td>
                              {prac.historial.map((v, vi) => {
                                const prev = vi > 0 ? prac.historial[vi - 1] : null
                                return (
                                  <td key={vi} className={`px-3 py-2 ${clsHist(v, prev)}`}>
                                    {v != null
                                      ? <>{fmt(v)}{vi > 0 && prev != null && v !== prev && (
                                          <span className={`ml-1 text-[10px] ${v > prev ? 'text-green-500' : 'text-red-500'}`}>
                                            {v > prev
                                              ? <ChevronUp size={10} className="inline" />
                                              : <ChevronDown size={10} className="inline" />}
                                            {Math.abs(((v - prev) / prev) * 100).toFixed(1)}%
                                          </span>
                                        )}</>
                                      : <span className="text-slate-200">—</span>
                                    }
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Leyenda */}
              <div className="px-4 py-2 border-t border-slate-50 flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                <div className="flex items-center gap-1">
                  <ChevronRight size={11} className="text-slate-400" />
                  Click en el plan para ver el detalle de códigos
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-green-100 inline-block" />
                  Var. promedio positiva
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-100 inline-block" />
                  Var. promedio negativa
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
