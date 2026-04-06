import api from './api'
import type {
  NormaOperativa,
  NormaOpOpciones,
  UpsertNormaOperativa,
  NormaOpAuditLog,
} from '../types'

export const normasOperativasService = {

  // ── Opciones de lookup (dropdowns) ───────────────────────────
  obtenerOpciones: async (): Promise<NormaOpOpciones> => {
    const r = await api.get<NormaOpOpciones>('/normasoperativas/opciones')
    return r.data
  },

  // ── Listar todas (con filtros opcionales) ─────────────────────
  listar: async (params?: { obraSocialId?: number; buscar?: string }): Promise<NormaOperativa[]> => {
    const r = await api.get<NormaOperativa[]>('/normasoperativas', { params })
    return r.data
  },

  // ── Obtener por id ────────────────────────────────────────────
  obtenerPorId: async (id: number): Promise<NormaOperativa> => {
    const r = await api.get<NormaOperativa>(`/normasoperativas/${id}`)
    return r.data
  },

  // ── Obtener por obra social (PK) ─────────────────────────────
  obtenerPorObraSocial: async (obraSocialId: number): Promise<NormaOperativa | null> => {
    const r = await api.get<NormaOperativa | null>(`/normasoperativas/por-obra-social/${obraSocialId}`)
    return r.data
  },

  // ── Obtener por código de obra social (cruce directo CodigoOs) ─
  obtenerPorCodigoOs: async (codigoOs: number, obraSocialId?: number): Promise<NormaOperativa | null> => {
    const r = await api.get<NormaOperativa | null>(`/normasoperativas/por-codigo/${codigoOs}`, {
      params: obraSocialId != null ? { obraSocialId } : undefined,
    })
    return r.data
  },

  // ── Crear ─────────────────────────────────────────────────────
  crear: async (dto: UpsertNormaOperativa, usuarioNombre: string): Promise<NormaOperativa> => {
    const r = await api.post<NormaOperativa>('/normasoperativas', dto, {
      params: { usuarioNombre },
    })
    return r.data
  },

  // ── Actualizar ────────────────────────────────────────────────
  actualizar: async (id: number, dto: UpsertNormaOperativa, usuarioNombre: string): Promise<NormaOperativa> => {
    const r = await api.put<NormaOperativa>(`/normasoperativas/${id}`, dto, {
      params: { usuarioNombre },
    })
    return r.data
  },

  // ── Eliminar ─────────────────────────────────────────────────
  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/normasoperativas/${id}`)
  },

  // ── Audit log ─────────────────────────────────────────────────
  obtenerAuditLog: async (normaId: number): Promise<NormaOpAuditLog[]> => {
    const r = await api.get<NormaOpAuditLog[]>(`/normasoperativas/${normaId}/auditlog`)
    return r.data
  },
}
