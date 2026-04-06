import api from './api';
import type {
  ObraSocial, ObraSocialList, CrearEditarObraSocial,
  ContactoObraSocial, CrearEditarContactoObraSocial,
  VigenciaObraSocial, CrearVigenciaObraSocial
} from '../types';

export const obrasSocialesService = {

  // ── Obras Sociales ─────────────────────────────────────────
  listar: async (params?: { buscar?: string; estado?: string }): Promise<ObraSocialList[]> => {
    const resp = await api.get<ObraSocialList[]>('/obrassociales', { params });
    return resp.data;
  },

  obtener: async (id: number): Promise<ObraSocial> => {
    const resp = await api.get<ObraSocial>(`/obrassociales/${id}`);
    return resp.data;
  },

  crear: async (datos: CrearEditarObraSocial): Promise<ObraSocial> => {
    const resp = await api.post<ObraSocial>('/obrassociales', datos);
    return resp.data;
  },

  actualizar: async (id: number, datos: CrearEditarObraSocial): Promise<ObraSocial> => {
    const resp = await api.put<ObraSocial>(`/obrassociales/${id}`, datos);
    return resp.data;
  },

  // ── Contactos ──────────────────────────────────────────────
  listarContactos: async (obraSocialId: number): Promise<ContactoObraSocial[]> => {
    const resp = await api.get<ContactoObraSocial[]>(`/obrassociales/${obraSocialId}/contactos`);
    return resp.data;
  },

  crearContacto: async (obraSocialId: number, datos: CrearEditarContactoObraSocial): Promise<ContactoObraSocial> => {
    const resp = await api.post<ContactoObraSocial>(`/obrassociales/${obraSocialId}/contactos`, datos);
    return resp.data;
  },

  actualizarContacto: async (obraSocialId: number, id: number, datos: CrearEditarContactoObraSocial): Promise<ContactoObraSocial> => {
    const resp = await api.put<ContactoObraSocial>(`/obrassociales/${obraSocialId}/contactos/${id}`, datos);
    return resp.data;
  },

  eliminarContacto: async (obraSocialId: number, id: number): Promise<void> => {
    await api.delete(`/obrassociales/${obraSocialId}/contactos/${id}`);
  },

  // ── Vigencias ──────────────────────────────────────────────
  listarVigencias: async (obraSocialId: number): Promise<VigenciaObraSocial[]> => {
    const resp = await api.get<VigenciaObraSocial[]>(`/obrassociales/${obraSocialId}/vigencias`);
    return resp.data;
  },

  crearVigencia: async (obraSocialId: number, datos: CrearVigenciaObraSocial): Promise<VigenciaObraSocial> => {
    const resp = await api.post<VigenciaObraSocial>(`/obrassociales/${obraSocialId}/vigencias`, datos);
    return resp.data;
  },

  actualizarVigencia: async (obraSocialId: number, id: number, datos: CrearVigenciaObraSocial): Promise<VigenciaObraSocial> => {
    const resp = await api.put<VigenciaObraSocial>(`/obrassociales/${obraSocialId}/vigencias/${id}`, datos);
    return resp.data;
  },
};
