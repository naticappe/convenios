// ============================================================
// CONTEXTO DE AUTENTICACIÓN
// Guarda la información del usuario que inició sesión y la
// comparte con todos los componentes que la necesitan.
// ============================================================

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Usuario, LoginRequest, LoginResponse } from '../types';
import { authService } from '../services/authService';

// Definimos qué datos y funciones expone el contexto
interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  estaAutenticado: boolean;
  cargando: boolean;
  login: (datos: LoginRequest) => Promise<void>;
  logout: () => void;
  tieneRol: (roles: string[]) => boolean;
}

// Creamos el contexto (empieza vacío)
const AuthContext = createContext<AuthContextType | null>(null);

// Proveedor: envuelve toda la app y provee el contexto
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al cargar la app, recuperamos la sesión guardada en localStorage
  useEffect(() => {
    const tokenGuardado   = localStorage.getItem('cc_token');
    const usuarioGuardado = localStorage.getItem('cc_usuario');

    if (tokenGuardado && usuarioGuardado) {
      try {
        setToken(tokenGuardado);
        setUsuario(JSON.parse(usuarioGuardado));
      } catch {
        // Si los datos están corruptos, limpiamos todo
        localStorage.removeItem('cc_token');
        localStorage.removeItem('cc_usuario');
      }
    }

    setCargando(false);
  }, []);

  // Función para iniciar sesión
  const login = async (datos: LoginRequest) => {
    const respuesta: LoginResponse = await authService.login(datos);

    // Guardar en memoria y en localStorage (para que persista al recargar)
    setToken(respuesta.token);
    setUsuario(respuesta.usuario);
    localStorage.setItem('cc_token',   respuesta.token);
    localStorage.setItem('cc_usuario', JSON.stringify(respuesta.usuario));
  };

  // Función para cerrar sesión
  const logout = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_usuario');
  };

  // Verifica si el usuario tiene alguno de los roles indicados
  const tieneRol = (roles: string[]) => {
    if (!usuario) return false;
    return roles.includes(usuario.rol);
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      token,
      estaAutenticado: !!usuario,
      cargando,
      login,
      logout,
      tieneRol
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto fácilmente
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
