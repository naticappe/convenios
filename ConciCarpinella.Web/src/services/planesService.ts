import api from './api';
import type {
  PlanList, PlanDetalle, CrearEditarPlan,
  VigenciaPlan, CrearVigenciaPlan
} from '../types';

export const planesService = {

  listar: async (params?: {
    obraSocialId?: number;
    nombre?: string;
    estado?: string;
  }): Promise<PlanList[]> => {
    const resp = await api.get<PlanList[]>('/planes', { params });
    return resp.data;
  },

  obtener: async (id: number): Promise<PlanDetalle> => {
    const resp = await api.get<PlanDetalle>(`/planes/${id}`);
    return resp.data;
  },

  crear: async (datos: CrearEditarPlan): Promise<PlanDetalle> => {
    const resp = await api.post<PlanDetalle>('/planes', datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: CrearEditarPlan): Promise<PlanDetalle> => {
    const resp = await api.put<PlanDetalle>(`/planes/${id}`, datos);
    return resp.data;
  },

  // ── Vigencias ───────────────────────────────────────────────
  listarVigencias: async (planId: number): Promise<VigenciaPlan[]> => {
    const resp = await api.get<VigenciaPlan[]>(`/planes/${planId}/vigencias`);
    return resp.data;
  },

  crearVigencia: async (planId: number, datos: CrearVigenciaPlan): Promise<VigenciaPlan> => {
    const resp = await api.post<VigenciaPlan>(`/planes/${planId}/vigencias`, datos);
    return resp.data;
  },

  actualizarVigencia: async (planId: number, id: number, datos: CrearVigenciaPlan): Promise<VigenciaPlan> => {
    const resp = await api.put<VigenciaPlan>(`/planes/${planId}/vigencias/${id}`, datos);
    return resp.data;
  },
};
