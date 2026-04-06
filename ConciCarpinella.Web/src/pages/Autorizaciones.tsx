// ============================================================
// PÁGINA DE AUTORIZACIONES
// Gestiona las autorizaciones médicas: lista, crea, edita
// y cambia el estado (Pendiente → Aprobada / Rechazada)
// ============================================================

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { autorizacionesService } from '../services/autorizacionesService'
import type { AutorizacionList, EstadoAutorizacion } from '../types'
import { FileCheck2, Search, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'

// Colores según el estado de la autorización
const colorEstado: Record<string, string> = {
  Pendiente: 'bg-amber-100 text-amber-700',
  Aprobada:  'bg-green-100 text-green-700',
  Rechazada: 'bg-red-100 text-red-700',
  Vencida:   'bg-slate-100 text-slate-600',
  Utilizada: 'bg-blue-100 text-blue-700',
}

export default function Autorizaciones() {
  const qc = useQueryClient()
  const [buscar, setBuscar] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EstadoAutorizacion | ''>('')

  const { data: autorizaciones, isLoading } = useQuery({
    queryKey: ['autorizaciones', filtroEstado],
    queryFn:  () => autorizacionesService.listar({
      estado: filtroEstado || undefined,
      buscarPaciente: buscar || undefined
    })
  })

  const cambiarEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: EstadoAutorizacion }) =>
      autorizacionesService.cambiarEstado(id, estado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['autorizaciones'] })
  })

  const formatFecha = (fecha?: string) =>
    fecha ? new Date(fecha).toLocaleDateString('es-AR') : '—'

  const lista = autorizaciones?.filter(a =>
    !buscar ||
    a.paciente.toLowerCase().includes(buscar.toLowerCase()) ||
    a.numero.includes(buscar)
  ) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck2 size={22} className="text-azul" />
            Autorizaciones
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">{lista.length} autorizaciones</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por paciente o N°..." value={buscar}
            onChange={e => setBuscar(e.target.value)}
            className="pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul w-64" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value as EstadoAutorizacion | '')}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-azul/30 focus:border-azul">
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobada">Aprobada</option>
          <option value="Rechazada">Rechazada</option>
          <option value="Vencida">Vencida</option>
          <option value="Utilizada">Utilizada</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-slate-400 text-sm">Cargando...</div> :
          lista.length === 0 ? <div className="p-10 text-center text-slate-400 text-sm">No hay autorizaciones</div> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">N° Autorización</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Paciente</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Obra Social / Plan</th>
                <th className="text-left px-4 py-3 text-slate-600 font-semibold">Práctica</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">Estado</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">F. Solicitud</th>
                <th className="text-center px-4 py-3 text-slate-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lista.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.numero}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.paciente}</td>
                  <td className="px-4 py-3">
                    <span className="text-slate-800">{a.obraSocial}</span>
                    <span className="text-slate-400 text-xs block">{a.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{a.practica}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorEstado[a.estado] ?? 'bg-slate-100'}`}>
                      {a.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500 text-xs">{formatFecha(a.fechaSolicitud)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {a.estado === 'Pendiente' && (
                        <>
                          <button
                            onClick={() => cambiarEstado.mutate({ id: a.id, estado: 'Aprobada' })}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Aprobar"
                          >
                            <CheckCircle size={15} />
                          </button>
                          <button
                            onClick={() => cambiarEstado.mutate({ id: a.id, estado: 'Rechazada' })}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Rechazar"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      {a.estado === 'Aprobada' && (
                        <button
                          onClick={() => cambiarEstado.mutate({ id: a.id, estado: 'Utilizada' })}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Marcar como utilizada"
                        >
                          <Clock size={15} />
                        </button>
                      )}
                      <button className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
