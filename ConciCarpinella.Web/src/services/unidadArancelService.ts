// ============================================================
// SERVICIO: Unidad Arancel
// Comunicación con el backend para el módulo de unidades arancelarias.
// ============================================================

import api from './api';
import type {
  UnidadArancel, UnidadArancelList,
  CrearEditarUnidadArancel, ActualizarVigenciaUA, ActualizarEstadoUA,
  UnidadArancelAuditLog,
  UnidadArancelImportPreview,
} from '../types';

const BASE = '/unidad-arancel';

export const unidadArancelService = {

  // ── Maestro ────────────────────────────────────────────────
  listar: async (params?: { buscar?: string; estado?: string }): Promise<UnidadArancelList[]> => {
    const resp = await api.get<UnidadArancelList[]>(BASE, { params });
    return resp.data;
  },

  obtener: async (id: number): Promise<UnidadArancel> => {
    const resp = await api.get<UnidadArancel>(`${BASE}/${id}`);
    return resp.data;
  },

  crear: async (datos: CrearEditarUnidadArancel): Promise<UnidadArancel> => {
    const resp = await api.post<UnidadArancel>(BASE, datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: CrearEditarUnidadArancel): Promise<UnidadArancel> => {
    const resp = await api.put<UnidadArancel>(`${BASE}/${id}`, datos);
    return resp.data;
  },

  actualizarVigencia: async (id: number, datos: ActualizarVigenciaUA): Promise<UnidadArancel> => {
    const resp = await api.patch<UnidadArancel>(`${BASE}/${id}/vigencia`, datos);
    return resp.data;
  },

  actualizarEstado: async (id: number, datos: ActualizarEstadoUA): Promise<UnidadArancel> => {
    const resp = await api.patch<UnidadArancel>(`${BASE}/${id}/estado`, datos);
    return resp.data;
  },

  // ── Auditoría ──────────────────────────────────────────────
  auditoriaPorId: async (id: number): Promise<UnidadArancelAuditLog[]> => {
    const resp = await api.get<UnidadArancelAuditLog[]>(`${BASE}/${id}/auditoria`);
    return resp.data;
  },

  auditoriaGlobal: async (params?: {
    usuarioNombre?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    accion?: string;
    unidadArancelId?: number;
  }): Promise<UnidadArancelAuditLog[]> => {
    const resp = await api.get<UnidadArancelAuditLog[]>(`${BASE}/auditoria`, { params });
    return resp.data;
  },

  // ── Export ─────────────────────────────────────────────────
  exportar: async (): Promise<Blob> => {
    const resp = await api.get(`${BASE}/exportar`, { responseType: 'blob' });
    return resp.data;
  },

  // ── Import ─────────────────────────────────────────────────
  importarPreview: async (archivo: File): Promise<UnidadArancelImportPreview> => {
    const form = new FormData();
    form.append('archivo', archivo);
    const resp = await api.post<UnidadArancelImportPreview>(`${BASE}/importar/preview`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return resp.data;
  },

  importarConfirmar: async (payload: {
    transactionId: string;
    filas: { nombre: string; vigenciaDesde: string; vigenciaHasta: string }[];
  }): Promise<{ mensaje: string; creadas: number; actualizadas: number }> => {
    const resp = await api.post(`${BASE}/importar/confirmar`, payload);
    return resp.data;
  },
};
