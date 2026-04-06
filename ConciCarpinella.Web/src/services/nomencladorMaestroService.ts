// ============================================================
// SERVICIO: NomencladorMaestro
// Comunicación con el backend para el módulo de Nomencladores.
// ============================================================

import api from './api';
import type {
  NomencladorMaestro, NomencladorMaestroList,
  CrearEditarNomencladorMaestro,
  ActualizarVigenciaNomenclador,
  ActualizarEstadoNomenclador,
  NomencladorMaestroAuditLog,
  NomencladorMaestroImportPreview,
} from '../types';

const BASE = '/nomenclador';

export const nomencladorMaestroService = {

  // ── Maestro ────────────────────────────────────────────────
  listar: async (params?: { buscar?: string; estado?: string }): Promise<NomencladorMaestroList[]> => {
    const resp = await api.get<NomencladorMaestroList[]>(BASE, { params });
    return resp.data;
  },

  obtener: async (id: number): Promise<NomencladorMaestro> => {
    const resp = await api.get<NomencladorMaestro>(`${BASE}/${id}`);
    return resp.data;
  },

  crear: async (datos: CrearEditarNomencladorMaestro): Promise<NomencladorMaestro> => {
    const resp = await api.post<NomencladorMaestro>(BASE, datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: CrearEditarNomencladorMaestro): Promise<NomencladorMaestro> => {
    const resp = await api.put<NomencladorMaestro>(`${BASE}/${id}`, datos);
    return resp.data;
  },

  actualizarVigencia: async (id: number, datos: ActualizarVigenciaNomenclador): Promise<NomencladorMaestro> => {
    const resp = await api.patch<NomencladorMaestro>(`${BASE}/${id}/vigencia`, datos);
    return resp.data;
  },

  actualizarEstado: async (id: number, datos: ActualizarEstadoNomenclador): Promise<NomencladorMaestro> => {
    const resp = await api.patch<NomencladorMaestro>(`${BASE}/${id}/estado`, datos);
    return resp.data;
  },

  // ── Auditoría ──────────────────────────────────────────────
  auditoriaPorId: async (id: number): Promise<NomencladorMaestroAuditLog[]> => {
    const resp = await api.get<NomencladorMaestroAuditLog[]>(`${BASE}/${id}/auditoria`);
    return resp.data;
  },

  auditoriaGlobal: async (params?: {
    usuarioNombre?: string;
    fechaDesde?:    string;
    fechaHasta?:    string;
    accion?:        string;
    nomencladorId?: number;
  }): Promise<NomencladorMaestroAuditLog[]> => {
    const resp = await api.get<NomencladorMaestroAuditLog[]>(`${BASE}/auditoria`, { params });
    return resp.data;
  },

  // ── Export ─────────────────────────────────────────────────
  exportar: async (): Promise<Blob> => {
    const resp = await api.get(`${BASE}/exportar`, { responseType: 'blob' });
    return resp.data;
  },

  // ── Import ─────────────────────────────────────────────────
  importarPreview: async (archivo: File): Promise<NomencladorMaestroImportPreview> => {
    const form = new FormData();
    form.append('archivo', archivo);
    const resp = await api.post<NomencladorMaestroImportPreview>(
      `${BASE}/importar/preview`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
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
