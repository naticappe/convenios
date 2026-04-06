// ============================================================
// SERVICIO: ClasificadorPracticas
// Todas las llamadas a la API del módulo Clasificador de Prácticas.
// ============================================================

import api from './api'
import type {
  ClasificadorPracticaList,
  ClasificadorPractica,
  CrearEditarClasificadorPractica,
  ClasificadorPracticaAuditLog,
  ClasificadorPracticaImportPreview,
  ConfirmarClasificadorImportacion,
} from '../types'

export const clasificadorPracticasService = {
  // ── CRUD ───────────────────────────────────────────────────
  listar: (params?: {
    nivel1?: string
    estado?: string
    buscar?: string
  }): Promise<ClasificadorPracticaList[]> =>
    api.get('/clasificador-practicas', { params }).then(r => r.data),

  obtener: (id: number): Promise<ClasificadorPractica> =>
    api.get(`/clasificador-practicas/${id}`).then(r => r.data),

  crear: (dto: CrearEditarClasificadorPractica): Promise<ClasificadorPractica> =>
    api.post('/clasificador-practicas', dto).then(r => r.data),

  actualizar: (id: number, dto: CrearEditarClasificadorPractica): Promise<ClasificadorPractica> =>
    api.put(`/clasificador-practicas/${id}`, dto).then(r => r.data),

  actualizarEstado: (id: number, activo: boolean): Promise<ClasificadorPractica> =>
    api.patch(`/clasificador-practicas/${id}/estado`, { activo }).then(r => r.data),

  // ── Auditoría ───────────────────────────────────────────────
  auditoriaPorId: (id: number): Promise<ClasificadorPracticaAuditLog[]> =>
    api.get(`/clasificador-practicas/${id}/auditoria`).then(r => r.data),

  auditoriaGlobal: (params?: {
    usuarioNombre?: string
    accion?: string
    fechaDesde?: string
    fechaHasta?: string
    clasificadorId?: number
  }): Promise<ClasificadorPracticaAuditLog[]> =>
    api.get('/clasificador-practicas/auditoria', { params }).then(r => r.data),

  // ── Excel ───────────────────────────────────────────────────
  exportar: (): Promise<Blob> =>
    api
      .get('/clasificador-practicas/exportar', { responseType: 'blob' })
      .then(r => r.data),

  importarPreview: (archivo: File): Promise<ClasificadorPracticaImportPreview> => {
    const fd = new FormData()
    fd.append('archivo', archivo)
    return api
      .post('/clasificador-practicas/importar/preview', fd, {
        // Eliminar el Content-Type global (application/json) para que el browser
        // lo setee automáticamente como multipart/form-data con el boundary correcto.
        headers: { 'Content-Type': undefined },
      })
      .then(r => r.data)
  },

  importarConfirmar: (dto: ConfirmarClasificadorImportacion): Promise<{
    mensaje: string
    transactionId: string
    creadas: number
    actualizadas: number
  }> =>
    api.post('/clasificador-practicas/importar/confirmar', dto).then(r => r.data),
}
