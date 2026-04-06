import api from './api'
import type {
  ImportacionValores,
  ParsearImportacionResponse,
  AplicarImportacionResponse,
  MatrizResponse,
  HistorialResponse,
} from '../types'

export const valoresService = {

  // ── Parsear archivo Excel (ETL) ───────────────────────────────
  parsear: async (
    obraSocialId: number,
    archivo: File,
    vigenciaDesde: string,
    etlConfigJson?: string,
  ): Promise<ParsearImportacionResponse> => {
    const formData = new FormData()
    formData.append('archivo', archivo)
    formData.append('vigenciaDesde', vigenciaDesde)
    if (etlConfigJson) formData.append('etlConfigJson', etlConfigJson)
    const resp = await api.post<ParsearImportacionResponse>(
      `/valores/parsear/${obraSocialId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return resp.data
  },

  // ── Aplicar importación a planes seleccionados ────────────────
  aplicar: async (dto: {
    importacionId: number
    nomencladorNombre?: string
    planes: { planId: number; ajustePorcentaje: number }[]
  }): Promise<AplicarImportacionResponse> => {
    const resp = await api.post<AplicarImportacionResponse>('/valores/aplicar', dto)
    return resp.data
  },

  // ── Listar importaciones anteriores de una OS ─────────────────
  listarImportaciones: async (obraSocialId: number): Promise<ImportacionValores[]> => {
    const resp = await api.get<ImportacionValores[]>(`/valores/importaciones/${obraSocialId}`)
    return resp.data
  },

  // ── Matriz: planes × prácticas con valores vigentes ──────────
  obtenerMatriz: async (obraSocialId: number): Promise<MatrizResponse> => {
    const resp = await api.get<MatrizResponse>(`/valores/matriz/${obraSocialId}`)
    return resp.data
  },

  // ── Historial: variaciones por fecha de importación ──────────
  obtenerHistorial: async (obraSocialId: number): Promise<HistorialResponse> => {
    const resp = await api.get<HistorialResponse>(`/valores/historial/${obraSocialId}`)
    return resp.data
  },
}
