import api from './api';
import type { Autorizacion, AutorizacionList, EstadoAutorizacion } from '../types';

interface FiltrosAutorizaciones {
  estado?: EstadoAutorizacion;
  planId?: number;
  buscarPaciente?: string;
}

export const autorizacionesService = {
  listar: async (filtros?: FiltrosAutorizaciones): Promise<AutorizacionList[]> => {
    const resp = await api.get<AutorizacionList[]>('/autorizaciones', { params: filtros });
    return resp.data;
  },

  obtener: async (id: number): Promise<Autorizacion> => {
    const resp = await api.get<Autorizacion>(`/autorizaciones/${id}`);
    return resp.data;
  },

  crear: async (datos: Partial<Autorizacion>): Promise<Autorizacion> => {
    const resp = await api.post<Autorizacion>('/autorizaciones', datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: Partial<Autorizacion>): Promise<Autorizacion> => {
    const resp = await api.put<Autorizacion>(`/autorizaciones/${id}`, datos);
    return resp.data;
  },

  cambiarEstado: async (id: number, estado: EstadoAutorizacion): Promise<void> => {
    await api.patch(`/autorizaciones/${id}/estado`, JSON.stringify(estado));
  },

  eliminar: async (id: number): Promise<void> => {
    await api.delete(`/autorizaciones/${id}`);
  },
};
