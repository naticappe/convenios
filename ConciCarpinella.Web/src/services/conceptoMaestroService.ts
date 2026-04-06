// ============================================================
// SERVICIO: ConceptoMaestro
// Comunicación con el backend para el módulo de Conceptos.
// ============================================================

import api from './api';
import type {
  ConceptoMaestro, ConceptoMaestroList,
  CrearEditarConceptoMaestro,
  ActualizarVigenciaConcepto,
  ActualizarEstadoConcepto,
  ConceptoMaestroAuditLog,
  ConceptoMaestroImportPreview,
} from '../types';

const BASE = '/concepto';

export const conceptoMaestroService = {

  // ── Maestro ────────────────────────────────────────────────
  listar: async (params?: { buscar?: string; estado?: string }): Promise<ConceptoMaestroList[]> => {
    const resp = await api.get<ConceptoMaestroList[]>(BASE, { params });
    return resp.data;
  },

  obtener: async (id: number): Promise<ConceptoMaestro> => {
    const resp = await api.get<ConceptoMaestro>(`${BASE}/${id}`);
    return resp.data;
  },

  crear: async (datos: CrearEditarConceptoMaestro): Promise<ConceptoMaestro> => {
    const resp = await api.post<ConceptoMaestro>(BASE, datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: CrearEditarConceptoMaestro): Promise<ConceptoMaestro> => {
    const resp = await api.put<ConceptoMaestro>(`${BASE}/${id}`, datos);
    return resp.data;
  },

  actualizarVigencia: async (id: number, datos: ActualizarVigenciaConcepto): Promise<ConceptoMaestro> => {
    const resp = await api.patch<ConceptoMaestro>(`${BASE}/${id}/vigencia`, datos);
    return resp.data;
  },

  actualizarEstado: async (id: number, datos: ActualizarEstadoConcepto): Promise<ConceptoMaestro> => {
    const resp = await api.patch<ConceptoMaestro>(`${BASE}/${id}/estado`, datos);
    return resp.data;
  },

  // ── Auditoría ──────────────────────────────────────────────
  auditoriaPorId: async (id: number): Promise<ConceptoMaestroAuditLog[]> => {
    const resp = await api.get<ConceptoMaestroAuditLog[]>(`${BASE}/${id}/auditoria`);
    return resp.data;
  },

  auditoriaGlobal: async (params?: {
    usuarioNombre?: string;
    fechaDesde?:    string;
    fechaHasta?:    string;
    accion?:        string;
    conceptoId?:    number;
  }): Promise<ConceptoMaestroAuditLog[]> => {
    const resp = await api.get<ConceptoMaestroAuditLog[]>(`${BASE}/auditoria`, { params });
    return resp.data;
  },

  // ── Export ─────────────────────────────────────────────────
  exportar: async (): Promise<Blob> => {
    const resp = await api.get(`${BASE}/exportar`, { responseType: 'blob' });
    return resp.data;
  },

  // ── Import ─────────────────────────────────────────────────
  importarPreview: async (archivo: File): Promise<ConceptoMaestroImportPreview> => {
    const form = new FormData();
    form.append('archivo', archivo);
    const resp = await api.post<ConceptoMaestroImportPreview>(
      `${BASE}/importar/preview`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return resp.data;
  },

  importarConfirmar: async (payload: {
    transactionId: string;
    filas: { nombre: string; sigla: string; vigenciaDesde: string; vigenciaHasta: string }[];
  }): Promise<{ mensaje: string; creados: number; actualizados: number }> => {
    const resp = await api.post(`${BASE}/importar/confirmar`, payload);
    return resp.data;
  },
};
