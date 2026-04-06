// ============================================================
// PÁGINA DE USUARIOS
// Solo visible para administradores
// Permite gestionar los usuarios del sistema
// ============================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { Usuario } from '../types'
import { Users, Pencil, UserX, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const colorRol: Record<string, string> = {
  Admin:      'bg-purple-100 text-purple-700',
  DataEntry:  'bg-blue-100 text-blue-700',
  Analista:   'bg-teal-100 text-teal-700',
  Secretario: 'bg-salmon/20 text-salmon-dark',
}

export default function Usuarios() {
  const qc = useQueryClient()
  const { tieneRol } = useAuth()

  // Solo admins pueden ver esta página
  if (!tieneRol(['Admin'])) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <UserX size={40} className="mb-3" />
        <p className="font-medium">Sin permisos</p>
        <p className="text-sm">Esta sección es solo para administradores.</p>
      </div>
    )
  }

  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form,     setForm]     = useState({ nombre: '', apellido: '', rol: '', activo: true, nuevoPassword: '' })
  const [error,    setError]    = useState<string | null>(null)

  const { data: usuarios, isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn:  () => api.get('/usuarios').then(r => r.data)
  })

  const actualizar = useMutation({
    mutationFn: () => api.put(`/usuarios/${editando!.id}`, {
      nombre: form.nombre, apellido: form.apellido, rol: form.rol,
      activo: form.activo, nuevoPassword: form.nuevoPassword || undefined
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); cerrarModal() },
    onError: (err: Error) => setError(err.message)
  })

  const abrirEditar = (u: Usuario) => {
    setEditando(u)
    setForm({ nombre: u.nombre, apellido: u.apellido, rol: u.rol, activo: u.activo, nuevoPassword: '' })
    setError(null)
  }

  const cerrarModal = () => { setEditando(null); setForm({ nombre: '', apellido: '', rol: '', activo: true, nuevoPassword: '' }); setError(null) }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={22} className="text-azul" />Usuarios del Sistema
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{usuarios?.length ?? 0} usuarios registrados</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-slate-400">Cargando...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 text-slate-600 font-semibold">Nombre</th>
                <th className="text-left px-5 py-3 text-slate-600 font-semibold">Email</th>
                <th className="text-center px-5 py-3 text-slate-600 font-semibold">Rol</th>
                <th className="text-center px-5 py-3 text-slate-600 font-semibold">Estado</th>
                <th className="text-left px-5 py-3 text-slate-600 font-semibold">Último acceso</th>
                <th className="text-center px-5 py-3 text-slate-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuarios?.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.apellido}, {u.nombre}</td>
                  <td className="px-5 py-3 text-slate-500">{u.email}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorRol[u.rol] ?? 'bg-slate-100 text-slate-600'}`}>{u.rol}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {u.activo
                      ? <span className="flex items-center justify-center gap-1 text-green-600 text-xs"><UserCheck size={13} />Activo</span>
                      : <span className="flex items-center justify-center gap-1 text-slate-400 text-xs"><UserX size={13} />Inactivo</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-slate-400 text-xs">
                    {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString('es-AR') : 'Nunca'}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => abrirEditar(u)} className="p-1.5 text-azul hover:bg-azul/10 rounded-lg" title="Editar">
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b"><h2 className="font-semibold text-slate-800">Editar Usuario</h2></div>
            <form onSubmit={e => { e.preventDefault(); actualizar.mutate() }} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2.5 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
                  <input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apellido</label>
                  <input value={form.apellido} onChange={e => setForm({...form, apellido: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <select value={form.rol} onChange={e => setForm({...form, rol: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30">
                  <option value="Admin">Administrador</option>
                  <option value="DataEntry">Carga de Datos</option>
                  <option value="Analista">Analista</option>
                  <option value="Secretario">Secretario/a</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña (dejar vacío para no cambiar)</label>
                <input type="password" value={form.nuevoPassword} onChange={e => setForm({...form, nuevoPassword: e.target.value})}
                  placeholder="••••••••"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-azul/30" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="activo-u" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} className="w-4 h-4 accent-azul" />
                <label htmlFor="activo-u" className="text-sm text-slate-700">Usuario activo</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrarModal} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button type="submit" disabled={actualizar.isPending} className="px-4 py-2 text-sm bg-azul text-white rounded-lg disabled:opacity-60">
                  {actualizar.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
