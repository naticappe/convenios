// ============================================================
// SERVICE: practicasService
// Todas las llamadas a /api/practicas
// ============================================================

import api from './api';
import type {
  PracticaList,
  Practica,
  CrearEditarPractica,
  ActualizarVigenciaPractica,
  PracticaConceptoUnidad,
  CrearEditarPracticaConceptoUnidad,
  PracticaAuditLog,
  PracticaImportPreview,
  ConfirmarImportacionPractica,
} from '../types';

export interface FiltrosPracticas {
  nomencladorId:    number;
  clasificadorId?:  number;
  estado?:          string;
  buscar?:          string;
}

export const practicasService = {

  // ── Listado ───────────────────────────────────────────────────
  listar: (filtros: FiltrosPracticas): Promise<PracticaList[]> =>
    api.get<PracticaList[]>('/practicas', { params: filtros }).then(r => r.data),

  // ── Detalle ───────────────────────────────────────────────────
  obtener: (id: number): Promise<Practica> =>
    api.get<Practica>(`/practicas/${id}`).then(r => r.data),

  // ── Crear ─────────────────────────────────────────────────────
  crear: (dto: CrearEditarPractica): Promise<Practica> =>
    api.post<Practica>('/practicas', dto).then(r => r.data),

  // ── Editar ────────────────────────────────────────────────────
  actualizar: (id: number, dto: CrearEditarPractica): Promise<Practica> =>
    api.put<Practica>(`/practicas/${id}`, dto).then(r => r.data),

  // ── Vigencia ──────────────────────────────────────────────────
  actualizarVigencia: (id: number, dto: ActualizarVigenciaPractica): Promise<Practica> =>
    api.patch<Practica>(`/practicas/${id}/vigencia`, dto).then(r => r.data),

  // ── Conceptos (detalle) ───────────────────────────────────────
  listarConceptos: (id: number): Promise<PracticaConceptoUnidad[]> =>
    api.get<PracticaConceptoUnidad[]>(`/practicas/${id}/conceptos`).then(r => r.data),

  crearConcepto: (id: number, dto: CrearEditarPracticaConceptoUnidad): Promise<PracticaConceptoUnidad> =>
    api.post<PracticaConceptoUnidad>(`/practicas/${id}/conceptos`, dto).then(r => r.data),

  actualizarConcepto: (id: number, conceptoId: number, dto: CrearEditarPracticaConceptoUnidad): Promise<PracticaConceptoUnidad> =>
    api.put<PracticaConceptoUnidad>(`/practicas/${id}/conceptos/${conceptoId}`, dto).then(r => r.data),

  vigenciaConcepto: (id: number, conceptoId: number, dto: ActualizarVigenciaPractica): Promise<PracticaConceptoUnidad> =>
    api.patch<PracticaConceptoUnidad>(`/practicas/${id}/conceptos/${conceptoId}/vigencia`, dto).then(r => r.data),

  // ── Auditoría ─────────────────────────────────────────────────
  auditoriaById: (id: number): Promise<PracticaAuditLog[]> =>
    api.get<PracticaAuditLog[]>(`/practicas/${id}/auditoria`).then(r => r.data),

  auditoriaGlobal: (params?: {
    usuarioNombre?: string;
    accion?: string;
    entidad?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<PracticaAuditLog[]> =>
    api.get<PracticaAuditLog[]>('/practicas/auditoria', { params }).then(r => r.data),

  // ── Exportar ──────────────────────────────────────────────────
  exportar: (filtros: FiltrosPracticas): Promise<Blob> =>
    api.get('/practicas/exportar', { params: filtros, responseType: 'blob' }).then(r => r.data),

  // ── Importar preview ──────────────────────────────────────────
  importarPreview: (archivo: File): Promise<PracticaImportPreview> => {
    const fd = new FormData();
    fd.append('archivo', archivo);
    return api.post<PracticaImportPreview>('/practicas/importar/preview', fd).then(r => r.data);
  },

  // ── Importar confirmar ────────────────────────────────────────
  importarConfirmar: (dto: ConfirmarImportacionPractica): Promise<{ mensaje: string; transactionId: string }> =>
    api.post('/practicas/importar/confirmar', dto).then(r => r.data),
};
