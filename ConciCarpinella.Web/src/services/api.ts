// ============================================================
// CONFIGURACIÓN GLOBAL DE AXIOS
// Axios es la librería que usamos para hacer peticiones HTTP
// a la API del backend. Aquí configuramos la URL base y
// el token de autenticación automático.
// ============================================================

import axios from 'axios';

// URL base del backend (el proxy de Vite redirige /api al backend)
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Interceptor de SOLICITUD ─────────────────────────────────
// Agrega automáticamente el token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Interceptor de RESPUESTA ─────────────────────────────────
// Si el servidor responde 401 (no autorizado), limpiamos la sesión
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // La sesión expiró o el token es inválido
      localStorage.removeItem('cc_token');
      localStorage.removeItem('cc_usuario');
      window.location.href = '/login';
    }
    // Extraemos el mensaje de error del servidor para mostrarlo al usuario
    const mensaje = error.response?.data?.mensaje
      || error.response?.data?.message
      || error.message
      || 'Ocurrió un error inesperado';
    return Promise.reject(new Error(mensaje));
  }
);

export default api;
