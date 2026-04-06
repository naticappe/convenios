// ============================================================
// NormaOperativaAdmin — Dashboard completo de normas operativas
// Muestra el 100% de los campos de la tabla NormaOperativa.
// Secciones tipo card con header colorido.
// Edición para DataEntry / Admin · Exportar PDF.
// ============================================================
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Pencil, Save, X, FileDown, ExternalLink,
  ShieldCheck, FileText, Hospital, Stethoscope,
  Receipt, Info, Lock, History, ChevronDown, ChevronUp,
} from 'lucide-react'
import { normasOperativasService } from '../services/normasOperativasService'
import type {
  NormaOperativa, NormaOpOpcion, NormaOpOpciones,
  UpsertNormaOperativa, NormaOpAuditLog, RolUsuario,
} from '../types'

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const fmtDate     = (iso?: string) => iso ? new Date(iso).toLocaleDateString('es-AR') : '—'
const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'

function normaToForm(n: NormaOperativa): UpsertNormaOperativa {
  return {
    obraSocialId: n.obraSocialId, nombreOs: n.nombreOs, codigoOs: n.codigoOs,
    linkDrive: n.linkDrive, coseguros: n.coseguros,
    tipoOrdenId: n.tipoOrden?.id, vigenciaOrdenId: n.vigenciaOrden?.id,
    fechaCalculoVigenciaId: n.fechaCalculoVigencia?.id,
    aceptaPedidoDigitalPreimpreso: n.aceptaPedidoDigitalPreimpreso,
    aceptaPedidoFirmaDigital: n.aceptaPedidoFirmaDigital,
    requiereAutorizacionExpresa: n.requiereAutorizacionExpresa,
    aceptaRpDigital: n.aceptaRpDigital,
    tipoAutorizacion: n.tipoAutorizacion, formatoAutorizacion: n.formatoAutorizacion,
    aceptaFotocopiaRp: n.aceptaFotocopiaRp,
    carnetDiscapacidadOncologico: n.carnetDiscapacidadOncologico,
    paginaObraSocial: n.paginaObraSocial, usuario: n.usuario,
    contrasena: n.contrasena, linkInstructivo: n.linkInstructivo,
    fechaAutorizacion: n.fechaAutorizacion, medicoNoAparece: n.medicoNoAparece,
    efectorImagenId: n.efectorImagen?.id, efectorConsultasId: n.efectorConsultas?.id,
    efectorOftalmologiaId: n.efectorOftalmologia?.id, efectorOtrasId: n.efectorOtras?.id,
    efectorNoAparece: n.efectorNoAparece,
    anestesias: n.anestesias, anatomiaPatologica: n.anatomiaPatologica, cirugia: n.cirugia,
    estudiosValorCeroId: n.estudiosValorCero?.id,
    observacionesAutorizaciones: n.observacionesAutorizaciones,
    horarioObraSocial: n.horarioObraSocial,
    fechaFacturacionId: n.fechaFacturacion?.id, documentacionId: n.documentacion?.id,
    modoCierreId: n.modoCierre?.id, copiasFacturasId: n.copiasFacturas?.id,
    direccionEntregaId: n.direccionEntrega?.id, contactoFacturacionId: n.contactoFacturacion?.id,
    soporteMagnetico: n.soporteMagnetico, libreDeDeuda: n.libreDeDeuda,
    troquelContrastes: n.troquelContrastes, laboratorioFacturaId: n.laboratorioFactura?.id,
    informacionAdicional: n.informacionAdicional,
  }
}

// ─────────────────────────────────────────────────────────────
// FIELD PRIMITIVES
// ─────────────────────────────────────────────────────────────

/** Fila texto — siempre visible (muestra "—" si vacío en view mode) */
function FieldRow({ label, value, link, editing, onChange, textarea, type }: {
  label: string; value?: string | null; link?: boolean
  editing?: boolean; onChange?: (v: string) => void; textarea?: boolean; type?: string
}) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0 items-start">
      <span className="w-52 flex-shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide pt-0.5">{label}</span>
      {editing ? (
        textarea
          ? <textarea className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[60px]"
              value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
          : <input type={type ?? 'text'} className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
      ) : link && value ? (
        <a href={value} target="_blank" rel="noreferrer"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all flex-1">
          {value} <ExternalLink size={11} className="flex-shrink-0" />
        </a>
      ) : (
        <span className={`text-sm flex-1 break-words whitespace-pre-wrap ${value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
          {value || '—'}
        </span>
      )}
    </div>
  )
}

/** Fila select de opciones — siempre visible */
function SelectRow({ label, value, opciones, editing, onChange }: {
  label: string; value?: NormaOpOpcion | null; opciones: NormaOpOpcion[]
  editing?: boolean; onChange?: (id: number | undefined) => void
}) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0 items-start">
      <span className="w-52 flex-shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide pt-0.5">{label}</span>
      {editing ? (
        <select className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={value?.id ?? ''} onChange={e => onChange?.(e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">— Sin selección —</option>
          {opciones.map(o => <option key={o.id} value={o.id}>{o.descripcion}</option>)}
        </select>
      ) : (
        <span className={`text-sm flex-1 break-words whitespace-pre-wrap ${value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
          {value?.descripcion || '—'}
        </span>
      )}
    </div>
  )
}

/** Fila select-de-texto: campo libre con opciones sugeridas (Anestesias, AP, Cirugía, EfectorNoAparece) */
function TextSelectRow({ label, value, opciones, editing, onChange, textarea }: {
  label: string; value?: string | null; opciones: NormaOpOpcion[]
  editing?: boolean; onChange?: (v: string) => void; textarea?: boolean
}) {
  if (!editing) {
    return (
      <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0 items-start">
        <span className="w-52 flex-shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide pt-0.5">{label}</span>
        <span className={`text-sm flex-1 break-words whitespace-pre-wrap ${value ? 'text-slate-800' : 'text-slate-300 italic'}`}>
          {value || '—'}
        </span>
      </div>
    )
  }
  const listId = `dl-${label.replace(/\s/g, '')}`
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0 items-start">
      <span className="w-52 flex-shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide pt-0.5">{label}</span>
      <div className="flex-1">
        {textarea ? (
          <textarea className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[60px]"
            list={listId} value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
        ) : (
          <input className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            list={listId} value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
        )}
        <datalist id={listId}>
          {opciones.map(o => <option key={o.id} value={o.descripcion} />)}
        </datalist>
        <p className="text-xs text-slate-400 mt-1">Podés escribir libremente o elegir de la lista</p>
      </div>
    </div>
  )
}

/** Fila booleana — siempre visible */
function BoolRow({ label, value, editing, onChange }: {
  label: string; value?: boolean | null; editing?: boolean; onChange?: (v: boolean | undefined) => void
}) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-slate-100 last:border-0 items-center">
      <span className="w-52 flex-shrink-0 text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</span>
      {editing ? (
        <select className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={value == null ? '' : value ? 'true' : 'false'}
          onChange={e => onChange?.(e.target.value === '' ? undefined : e.target.value === 'true')}>
          <option value="">— Sin selección —</option>
          <option value="true">SÍ</option>
          <option value="false">NO</option>
        </select>
      ) : value == null ? (
        <span className="text-sm text-slate-300 italic">—</span>
      ) : value ? (
        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">✓ SÍ</span>
      ) : (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">✗ NO</span>
      )}
    </div>
  )
}

/** Badge SI/NO para tabla de documentación */
function DocBadge({ value, editing, onChange }: {
  value?: boolean | null; editing?: boolean; onChange?: (v: boolean | undefined) => void
}) {
  if (editing) return (
    <select className="border border-slate-300 rounded px-2 py-1 text-xs"
      value={value == null ? '' : value ? 'true' : 'false'}
      onChange={e => onChange?.(e.target.value === '' ? undefined : e.target.value === 'true')}>
      <option value="">—</option>
      <option value="true">SÍ</option>
      <option value="false">NO</option>
    </select>
  )
  if (value == null) return <span className="text-slate-300 text-xs italic">—</span>
  return value
    ? <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full">✓ SÍ</span>
    : <span className="inline-flex items-center gap-1 bg-red-100 text-red-600 text-xs font-semibold px-3 py-1 rounded-full">✗ NO</span>
}

/** Badge texto "SÍ"/"NO"/"True"/"False" para tabla de documentación */
function DocTextBadge({ value, editing, onChange }: {
  value?: string | null; editing?: boolean; onChange?: (v: string) => void
}) {
  if (editing) return (
    <input className="border border-slate-300 rounded px-2 py-1 text-xs w-24 text-center"
      value={value ?? ''} onChange={e => onChange?.(e.target.value)} />
  )
  if (!value) return <span className="text-slate-300 text-xs italic">—</span>
  const isNo = ['no', 'false', 'no acepta'].includes(value.toLowerCase())
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full ${isNo ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
      {isNo ? '✗' : '✓'} {value}
    </span>
  )
}

/** Cabecera de sección colorida */
function SectionHeader({ color, icon, title }: { color: string; icon: React.ReactNode; title: string }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 ${color}`}>
      <span className="opacity-70">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PDF EXPORT
// ─────────────────────────────────────────────────────────────

function exportarPDF(norma: NormaOperativa) {
  const bool  = (v?: boolean | null) => v == null ? '—' : v ? '✓ SÍ' : '✗ NO'
  const val   = (v?: string | null)  => v ? v.replace(/</g,'&lt;') : '—'
  const opVal = (v?: NormaOpOpcion | null) => v?.descripcion ? v.descripcion.replace(/</g,'&lt;') : '—'
  const boolCls = (v?: boolean | null) => v == null ? 'nd' : v ? 'si' : 'no'
  const txtCls  = (v?: string | null) => {
    if (!v) return 'nd'
    return ['no','false','no acepta'].includes(v.toLowerCase()) ? 'no' : 'si'
  }

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<title>Norma Operativa — ${norma.nombreOs}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1e293b;background:#f8fafc;padding:24px}
h1{font-size:18px;font-weight:700;color:#0f172a}
.sub{font-size:11px;color:#64748b;margin-bottom:20px;margin-top:3px}
.card{background:#fff;border-radius:10px;margin-bottom:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.07);page-break-inside:avoid}
.ch{display:flex;align-items:center;gap:8px;padding:8px 16px;font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.cb{padding:6px 16px 10px}
.row{display:flex;gap:8px;padding:5px 0;border-bottom:1px solid #f1f5f9;align-items:flex-start}
.row:last-child{border:none}
.lbl{width:190px;flex-shrink:0;font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;padding-top:2px}
.val{flex:1;font-size:11px;color:#1e293b;word-break:break-word;white-space:pre-wrap}
.val.empty{color:#cbd5e1;font-style:italic}
.si{display:inline-block;background:#dcfce7;color:#16a34a;font-weight:700;font-size:9px;padding:2px 8px;border-radius:20px}
.no{display:inline-block;background:#fee2e2;color:#dc2626;font-weight:700;font-size:9px;padding:2px 8px;border-radius:20px}
.nd{color:#cbd5e1;font-style:italic;font-size:10px}
.doc-tbl{width:100%;border-collapse:collapse;margin-top:4px}
.doc-tbl th{background:#f8fafc;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:7px 6px;border:1px solid #e2e8f0;text-align:center}
.doc-tbl td{padding:8px 6px;border:1px solid #e2e8f0;text-align:center}
.h-auto{background:#eff6ff;color:#1d4ed8}
.h-doc{background:#f0fdf4;color:#15803d}
.h-acc{background:#fef3c7;color:#b45309}
.h-ef{background:#f0f9ff;color:#0369a1}
.h-pr{background:#fdf4ff;color:#7e22ce}
.h-fac{background:#fff7ed;color:#c2410c}
.h-add{background:#f8fafc;color:#475569}
.footer{margin-top:16px;font-size:9px;color:#94a3b8;text-align:right;border-top:1px solid #e2e8f0;padding-top:8px}
a{color:#2563eb}
@media print{body{background:#fff;padding:0}}
</style></head><body>
<h1>${val(norma.nombreOs)}</h1>
<p class="sub">Código OS: ${norma.codigoOs ?? '—'}${norma.linkDrive ? ` · <a href="${norma.linkDrive}" target="_blank">Ver en Drive ↗</a>` : ''}</p>

<div class="card">
<div class="ch h-auto">🛡 Coseguros y Autorización</div>
<div class="cb">
<div class="row"><div class="lbl">Coseguros</div><div class="val ${norma.coseguros?'':'empty'}">${val(norma.coseguros)}</div></div>
<div class="row"><div class="lbl">Tipo de Orden</div><div class="val ${norma.tipoOrden?'':'empty'}">${opVal(norma.tipoOrden)}</div></div>
<div class="row"><div class="lbl">Vigencia de la Orden</div><div class="val ${norma.vigenciaOrden?'':'empty'}">${opVal(norma.vigenciaOrden)}</div></div>
<div class="row"><div class="lbl">Fecha Cálculo Vigencia</div><div class="val ${norma.fechaCalculoVigencia?'':'empty'}">${opVal(norma.fechaCalculoVigencia)}</div></div>
<div class="row"><div class="lbl">Tipo Autorización</div><div class="val ${norma.tipoAutorizacion?'':'empty'}">${val(norma.tipoAutorizacion)}</div></div>
<div class="row"><div class="lbl">Formato Autorización</div><div class="val ${norma.formatoAutorizacion?'':'empty'}">${val(norma.formatoAutorizacion)}</div></div>
<div class="row"><div class="lbl">Fecha Autorización</div><div class="val ${norma.fechaAutorizacion?'':'empty'}">${val(norma.fechaAutorizacion)}</div></div>
<div class="row"><div class="lbl">Carnet Discap./Oncológico</div><div class="val ${norma.carnetDiscapacidadOncologico?'':'empty'}">${val(norma.carnetDiscapacidadOncologico)}</div></div>
<div class="row"><div class="lbl">Médico no aparece</div><div class="val ${norma.medicoNoAparece?'':'empty'}">${val(norma.medicoNoAparece)}</div></div>
</div></div>

<div class="card">
<div class="ch h-doc">📄 Documentación Aceptada</div>
<div class="cb">
<table class="doc-tbl"><tr>
<th>Pedido Digital<br/>Pre-impreso</th>
<th>Pedido con<br/>Firma Digital</th>
<th>Req. Autorizacion Expresa<br/>Conci Carpinella</th>
<th>RP en<br/>Formato Digital</th>
<th>Fotocopia/Foto<br/>del RP</th>
</tr><tr>
<td><span class="${txtCls(norma.aceptaPedidoDigitalPreimpreso)}">${val(norma.aceptaPedidoDigitalPreimpreso)}</span></td>
<td><span class="${boolCls(norma.aceptaPedidoFirmaDigital)}">${bool(norma.aceptaPedidoFirmaDigital)}</span></td>
<td><span class="${txtCls(norma.requiereAutorizacionExpresa)}">${val(norma.requiereAutorizacionExpresa)}</span></td>
<td><span class="${txtCls(norma.aceptaRpDigital)}">${val(norma.aceptaRpDigital)}</span></td>
<td><span class="${txtCls(norma.aceptaFotocopiaRp)}">${val(norma.aceptaFotocopiaRp)}</span></td>
</tr></table>
</div></div>

<div class="card">
<div class="ch h-acc">🔑 Acceso al Sistema</div>
<div class="cb">
<div class="row"><div class="lbl">Página Obra Social</div><div class="val ${norma.paginaObraSocial?'':'empty'}">${norma.paginaObraSocial ? `<a href="${norma.paginaObraSocial}">${norma.paginaObraSocial}</a>` : '—'}</div></div>
<div class="row"><div class="lbl">Usuario</div><div class="val ${norma.usuario?'':'empty'}">${val(norma.usuario)}</div></div>
<div class="row"><div class="lbl">Contraseña</div><div class="val ${norma.contrasena?'':'empty'}">${val(norma.contrasena)}</div></div>
<div class="row"><div class="lbl">Link Instructivo</div><div class="val ${norma.linkInstructivo?'':'empty'}">${norma.linkInstructivo ? `<a href="${norma.linkInstructivo}">${val(norma.linkInstructivo)}</a>` : '—'}</div></div>
</div></div>

<div class="card">
<div class="ch h-ef">🏥 Efectores</div>
<div class="cb">
<div class="row"><div class="lbl">Efector Imagen</div><div class="val ${norma.efectorImagen?'':'empty'}">${opVal(norma.efectorImagen)}</div></div>
<div class="row"><div class="lbl">Efector Consultas</div><div class="val ${norma.efectorConsultas?'':'empty'}">${opVal(norma.efectorConsultas)}</div></div>
<div class="row"><div class="lbl">Efector Oftalmología</div><div class="val ${norma.efectorOftalmologia?'':'empty'}">${opVal(norma.efectorOftalmologia)}</div></div>
<div class="row"><div class="lbl">Efector Otras</div><div class="val ${norma.efectorOtras?'':'empty'}">${opVal(norma.efectorOtras)}</div></div>
<div class="row"><div class="lbl">Efector no aparece</div><div class="val ${norma.efectorNoAparece?'':'empty'}">${val(norma.efectorNoAparece)}</div></div>
</div></div>

<div class="card">
<div class="ch h-pr">🩺 Prácticas Especiales</div>
<div class="cb">
<div class="row"><div class="lbl">Anestesias</div><div class="val ${norma.anestesias?'':'empty'}">${val(norma.anestesias)}</div></div>
<div class="row"><div class="lbl">Anatomía Patológica</div><div class="val ${norma.anatomiaPatologica?'':'empty'}">${val(norma.anatomiaPatologica)}</div></div>
<div class="row"><div class="lbl">Cirugía</div><div class="val ${norma.cirugia?'':'empty'}">${val(norma.cirugia)}</div></div>
<div class="row"><div class="lbl">Estudios Valor Cero</div><div class="val ${norma.estudiosValorCero?'':'empty'}">${opVal(norma.estudiosValorCero)}</div></div>
<div class="row"><div class="lbl">Obs. Autorizaciones</div><div class="val ${norma.observacionesAutorizaciones?'':'empty'}">${val(norma.observacionesAutorizaciones)}</div></div>
<div class="row"><div class="lbl">Horario OS</div><div class="val ${norma.horarioObraSocial?'':'empty'}">${val(norma.horarioObraSocial)}</div></div>
</div></div>

<div class="card">
<div class="ch h-fac">🧾 Facturación</div>
<div class="cb">
<div class="row"><div class="lbl">Fecha Facturación</div><div class="val ${norma.fechaFacturacion?'':'empty'}">${opVal(norma.fechaFacturacion)}</div></div>
<div class="row"><div class="lbl">Documentación</div><div class="val ${norma.documentacion?'':'empty'}">${opVal(norma.documentacion)}</div></div>
<div class="row"><div class="lbl">Modo Cierre</div><div class="val ${norma.modoCierre?'':'empty'}">${opVal(norma.modoCierre)}</div></div>
<div class="row"><div class="lbl">Copias Facturas</div><div class="val ${norma.copiasFacturas?'':'empty'}">${opVal(norma.copiasFacturas)}</div></div>
<div class="row"><div class="lbl">Dirección Entrega</div><div class="val ${norma.direccionEntrega?'':'empty'}">${opVal(norma.direccionEntrega)}</div></div>
<div class="row"><div class="lbl">Contacto Facturación</div><div class="val ${norma.contactoFacturacion?'':'empty'}">${opVal(norma.contactoFacturacion)}</div></div>
<div class="row"><div class="lbl">Soporte Magnético</div><div class="val"><span class="${boolCls(norma.soporteMagnetico)}">${bool(norma.soporteMagnetico)}</span></div></div>
<div class="row"><div class="lbl">Libre de Deuda</div><div class="val"><span class="${boolCls(norma.libreDeDeuda)}">${bool(norma.libreDeDeuda)}</span></div></div>
<div class="row"><div class="lbl">Troquel Contrastes</div><div class="val"><span class="${boolCls(norma.troquelContrastes)}">${bool(norma.troquelContrastes)}</span></div></div>
<div class="row"><div class="lbl">Laboratorio Factura</div><div class="val ${norma.laboratorioFactura?'':'empty'}">${opVal(norma.laboratorioFactura)}</div></div>
</div></div>

<div class="card">
<div class="ch h-add">ℹ Información Adicional</div>
<div class="cb">
<div class="val ${norma.informacionAdicional?'':'empty'}" style="padding:6px 0">${val(norma.informacionAdicional)}</div>
</div></div>

<div class="footer">
${norma.creadoPor?`Creado por ${norma.creadoPor} · `:''}${norma.modificadoPor?`Última mod. ${norma.modificadoPor} (${fmtDate(norma.fechaUltimaModificacion)}) · `:''}Generado ${new Date().toLocaleString('es-AR')}
</div>
<script>window.onload=()=>window.print()</script>
</body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────

interface Props {
  obraSocialId?: number   // PK de la obra social (para vincular FK al guardar)
  codigoOs?:     number   // Código numérico de la OS (cruce directo con NormaOperativa.CodigoOs)
  normaId?:      number   // PK directo de la norma (cuando se navega desde el listado)
  usuarioNombre: string
  usuarioRol:    RolUsuario
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export function NormaOperativaAdmin({ obraSocialId, codigoOs, normaId: normaIdProp, usuarioNombre, usuarioRol }: Props) {
  const qc      = useQueryClient()
  const canEdit = usuarioRol === 'DataEntry' || usuarioRol === 'Admin'

  const [editing,   setEditing]   = useState(false)
  const [form,      setForm]      = useState<UpsertNormaOperativa | null>(null)
  const [auditOpen, setAuditOpen] = useState(false)

  // ── Queries ──────────────────────────────────────────────────
  const { data: opciones = {} as NormaOpOpciones } = useQuery({
    queryKey: ['normas-opciones'],
    queryFn:  normasOperativasService.obtenerOpciones,
    staleTime: Infinity,
  })

  // Búsqueda por código OS (cruce directo CodigoOs == codigoOs)
  const { data: normaByCodigoOs, isLoading: loadingCodigo } = useQuery({
    queryKey: ['norma-by-codigo', codigoOs],
    queryFn:  () => normasOperativasService.obtenerPorCodigoOs(codigoOs!, obraSocialId),
    enabled:  !!codigoOs && !normaIdProp,
  })

  const { data: normaById, isLoading: loadingId } = useQuery({
    queryKey: ['norma-by-id', normaIdProp],
    queryFn:  () => normasOperativasService.obtenerPorId(normaIdProp!),
    enabled:  !!normaIdProp,
  })

  const norma     = (normaIdProp ? normaById : normaByCodigoOs) as NormaOperativa | null | undefined
  const isLoading = normaIdProp ? loadingId : loadingCodigo

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['norma-audit', norma?.id],
    queryFn:  () => normasOperativasService.obtenerAuditLog(norma!.id),
    enabled:  auditOpen && !!norma?.id,
  })

  useEffect(() => { if (norma) setForm(normaToForm(norma)) }, [norma])

  // ── Mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (dto: UpsertNormaOperativa) =>
      norma
        ? normasOperativasService.actualizar(norma.id, dto, usuarioNombre)
        : normasOperativasService.crear(dto, usuarioNombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['norma-by-codigo', codigoOs] })
      qc.invalidateQueries({ queryKey: ['norma-by-id', normaIdProp] })
      qc.invalidateQueries({ queryKey: ['norma-audit'] })
      setEditing(false)
    },
  })

  // ── Helpers ───────────────────────────────────────────────────
  // IMPORTANTE: nombres de categoría exactos como están en la DB
  const op  = (cat: string) => (opciones[cat] ?? []) as NormaOpOpcion[]
  const res = (cat: string, id?: number) => id == null ? undefined : op(cat).find(o => o.id === id)
  const set = <K extends keyof UpsertNormaOperativa>(k: K, v: UpsertNormaOperativa[K]) =>
    setForm(p => ({ ...(p ?? {}), [k]: v } as UpsertNormaOperativa))

  // Valores a mostrar: form cuando editando, norma cuando viendo
  const d: Partial<NormaOperativa> = editing && form ? {
    ...norma,
    nombreOs:                     form.nombreOs,
    codigoOs:                     form.codigoOs,
    linkDrive:                    form.linkDrive,
    coseguros:                    form.coseguros,
    // 'Efector' es la categoría correcta para EfectorImagen y EfectorOtras
    tipoOrden:                    res('TipoOrden',            form.tipoOrdenId),
    vigenciaOrden:                res('VigenciaOrden',        form.vigenciaOrdenId),
    fechaCalculoVigencia:         res('FechaCalculoVigencia', form.fechaCalculoVigenciaId),
    aceptaPedidoDigitalPreimpreso:form.aceptaPedidoDigitalPreimpreso,
    aceptaPedidoFirmaDigital:     form.aceptaPedidoFirmaDigital,
    requiereAutorizacionExpresa:  form.requiereAutorizacionExpresa,
    aceptaRpDigital:              form.aceptaRpDigital,
    tipoAutorizacion:             form.tipoAutorizacion,
    formatoAutorizacion:          form.formatoAutorizacion,
    aceptaFotocopiaRp:            form.aceptaFotocopiaRp,
    carnetDiscapacidadOncologico: form.carnetDiscapacidadOncologico,
    paginaObraSocial:             form.paginaObraSocial,
    usuario:                      form.usuario,
    contrasena:                   form.contrasena,
    linkInstructivo:              form.linkInstructivo,
    fechaAutorizacion:            form.fechaAutorizacion,
    medicoNoAparece:              form.medicoNoAparece,
    efectorImagen:                res('Efector',              form.efectorImagenId),
    efectorConsultas:             res('EfectorConsultas',     form.efectorConsultasId),
    efectorOftalmologia:          res('EfectorOftalmologia',  form.efectorOftalmologiaId),
    efectorOtras:                 res('Efector',              form.efectorOtrasId),
    efectorNoAparece:             form.efectorNoAparece,
    anestesias:                   form.anestesias,
    anatomiaPatologica:           form.anatomiaPatologica,
    cirugia:                      form.cirugia,
    estudiosValorCero:            res('EstudiosValorCero',    form.estudiosValorCeroId),
    observacionesAutorizaciones:  form.observacionesAutorizaciones,
    horarioObraSocial:            form.horarioObraSocial,
    fechaFacturacion:             res('FechaFacturacion',     form.fechaFacturacionId),
    documentacion:                res('Documentacion',        form.documentacionId),
    modoCierre:                   res('ModoCierre',           form.modoCierreId),
    copiasFacturas:               res('CopiasFacturas',       form.copiasFacturasId),
    direccionEntrega:             res('DireccionEntrega',     form.direccionEntregaId),
    contactoFacturacion:          res('ContactoFacturacion',  form.contactoFacturacionId),
    soporteMagnetico:             form.soporteMagnetico,
    libreDeDeuda:                 form.libreDeDeuda,
    troquelContrastes:            form.troquelContrastes,
    laboratorioFactura:           res('LaboratorioFactura',   form.laboratorioFacturaId),
    informacionAdicional:         form.informacionAdicional,
  } : (norma ?? {})

  // ── Loading / vacío ───────────────────────────────────────────
  if (isLoading) return (
    <div className="flex items-center gap-3 py-10 justify-center text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-300 border-t-rose-500 rounded-full animate-spin" />
      <span className="text-sm">Cargando norma operativa…</span>
    </div>
  )

  if (!norma && !canEdit) return (
    <div className="py-10 text-center text-slate-400 text-sm">
      No hay norma operativa cargada para esta obra social.
    </div>
  )

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0.5">

      {/* Barra de acciones */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">{norma?.nombreOs ?? 'Nueva norma operativa'}</h3>
          <p className="text-xs text-slate-400">
            {norma?.codigoOs ? `Cód. OS: ${norma.codigoOs}` : ''}
            {norma?.fechaUltimaModificacion ? `  ·  Última mod. ${fmtDate(norma.fechaUltimaModificacion)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {norma?.linkDrive && (
            <a href={norma.linkDrive} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline border border-blue-200 px-3 py-1.5 rounded-lg">
              <ExternalLink size={12} /> Drive
            </a>
          )}
          {norma && (
            <button onClick={() => exportarPDF(norma)}
              className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg">
              <FileDown size={13} /> Exportar PDF
            </button>
          )}
          {canEdit && !editing && (
            <button onClick={() => { if (!form && norma) setForm(normaToForm(norma)); else if (!form) setForm({ nombreOs: '', obraSocialId }); setEditing(true) }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
              <Pencil size={13} /> Editar
            </button>
          )}
          {canEdit && editing && <>
            <button onClick={() => { setEditing(false); if (norma) setForm(normaToForm(norma)) }}
              className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg">
              <X size={13} /> Cancelar
            </button>
            <button disabled={saveMutation.isPending} onClick={() => form && saveMutation.mutate(form)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-60">
              <Save size={13} /> {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </>}
        </div>
      </div>

      {saveMutation.isError && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          Error al guardar. Revisá la conexión con el servidor.
        </div>
      )}

      {/* ══ IDENTIFICACIÓN ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-slate-50 text-slate-600" icon={<FileText size={14}/>} title="Identificación" />
        <div className="px-4 py-1 bg-white">
          <FieldRow label="Nombre OS"    value={d.nombreOs}  editing={editing} onChange={v => set('nombreOs', v)} />
          <FieldRow label="Código OS"    value={d.codigoOs != null ? String(d.codigoOs) : null} editing={editing} onChange={v => set('codigoOs', v ? Number(v) : undefined)} type="number" />
          <FieldRow label="Link Drive"   value={d.linkDrive}  link editing={editing} onChange={v => set('linkDrive', v)} />
        </div>
      </div>

      {/* ══ COSEGUROS Y AUTORIZACIÓN ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-blue-50 text-blue-800" icon={<ShieldCheck size={14}/>} title="Coseguros y Autorización" />
        <div className="px-4 py-1 bg-white">
          <FieldRow    label="Coseguros"                      value={d.coseguros}                      editing={editing} onChange={v => set('coseguros', v)} textarea />
          <SelectRow   label="Tipo de Orden"                  value={d.tipoOrden}                      opciones={op('TipoOrden')}            editing={editing} onChange={id => set('tipoOrdenId', id)} />
          <SelectRow   label="Vigencia de la Orden"           value={d.vigenciaOrden}                  opciones={op('VigenciaOrden')}         editing={editing} onChange={id => set('vigenciaOrdenId', id)} />
          <SelectRow   label="Fecha Cálculo Vigencia"         value={d.fechaCalculoVigencia}           opciones={op('FechaCalculoVigencia')}  editing={editing} onChange={id => set('fechaCalculoVigenciaId', id)} />
          <FieldRow    label="Tipo Autorización"              value={d.tipoAutorizacion}               editing={editing} onChange={v => set('tipoAutorizacion', v)} textarea />
          <FieldRow    label="Formato Autorización"           value={d.formatoAutorizacion}            editing={editing} onChange={v => set('formatoAutorizacion', v)} textarea />
          <FieldRow    label="Fecha Autorización"             value={d.fechaAutorizacion}              editing={editing} onChange={v => set('fechaAutorizacion', v)} />
          <FieldRow    label="Carnet Discap./Oncológico"      value={d.carnetDiscapacidadOncologico}   editing={editing} onChange={v => set('carnetDiscapacidadOncologico', v)} />
          <FieldRow    label="Médico no aparece"              value={d.medicoNoAparece}                editing={editing} onChange={v => set('medicoNoAparece', v)} textarea />
        </div>
      </div>

      {/* ══ DOCUMENTACIÓN ACEPTADA ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-emerald-50 text-emerald-800" icon={<FileText size={14}/>} title="Documentación Aceptada" />
        <div className="px-4 py-3 bg-white overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {['Pedido Digital\nPre-impreso','Pedido con\nFirma Digital','Req. Autorizacion Expresa\nConci Carpinella','RP en\nFormato Digital','Fotocopia/Foto\ndel RP'].map(h => (
                  <th key={h} className="px-3 py-2 border border-slate-200 font-semibold text-slate-500 whitespace-pre-line text-xs leading-tight">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-3 border border-slate-200">
                  <DocTextBadge value={d.aceptaPedidoDigitalPreimpreso} editing={editing} onChange={v => set('aceptaPedidoDigitalPreimpreso', v)} />
                </td>
                <td className="px-3 py-3 border border-slate-200">
                  <DocBadge value={d.aceptaPedidoFirmaDigital} editing={editing} onChange={v => set('aceptaPedidoFirmaDigital', v)} />
                </td>
                <td className="px-3 py-3 border border-slate-200">
                  <DocTextBadge value={d.requiereAutorizacionExpresa} editing={editing} onChange={v => set('requiereAutorizacionExpresa', v)} />
                </td>
                <td className="px-3 py-3 border border-slate-200">
                  <DocTextBadge value={d.aceptaRpDigital} editing={editing} onChange={v => set('aceptaRpDigital', v)} />
                </td>
                <td className="px-3 py-3 border border-slate-200">
                  <DocTextBadge value={d.aceptaFotocopiaRp} editing={editing} onChange={v => set('aceptaFotocopiaRp', v)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ ACCESO AL SISTEMA ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-amber-50 text-amber-800" icon={<Lock size={14}/>} title="Acceso al Sistema" />
        <div className="px-4 py-1 bg-white">
          <FieldRow label="Página Obra Social"          value={d.paginaObraSocial}  link editing={editing} onChange={v => set('paginaObraSocial', v)} />
          <FieldRow label="Usuario"                     value={d.usuario}           editing={editing} onChange={v => set('usuario', v)} />
          <FieldRow label="Contraseña"                  value={d.contrasena}        editing={editing} onChange={v => set('contrasena', v)} />
          <FieldRow label="Link Instructivo Autorizaciones" value={d.linkInstructivo} link editing={editing} onChange={v => set('linkInstructivo', v)} />
        </div>
      </div>

      {/* ══ EFECTORES ══ */}
      {/* EfectorImagen y EfectorOtras usan categoría 'Efector' en la DB */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-sky-50 text-sky-800" icon={<Hospital size={14}/>} title="Efectores" />
        <div className="px-4 py-1 bg-white">
          <SelectRow       label="Efector Imagen"        value={d.efectorImagen}       opciones={op('Efector')}            editing={editing} onChange={id => set('efectorImagenId', id)} />
          <SelectRow       label="Efector Consultas"     value={d.efectorConsultas}    opciones={op('EfectorConsultas')}   editing={editing} onChange={id => set('efectorConsultasId', id)} />
          <SelectRow       label="Efector Oftalmología"  value={d.efectorOftalmologia} opciones={op('EfectorOftalmologia')} editing={editing} onChange={id => set('efectorOftalmologiaId', id)} />
          <SelectRow       label="Efector Otras"         value={d.efectorOtras}        opciones={op('Efector')}            editing={editing} onChange={id => set('efectorOtrasId', id)} />
          <TextSelectRow   label="Efector no aparece"    value={d.efectorNoAparece}    opciones={op('EfectorNoAparece')}   editing={editing} onChange={v => set('efectorNoAparece', v)} textarea />
        </div>
      </div>

      {/* ══ PRÁCTICAS ESPECIALES ══ */}
      {/* Anestesias, AnatomiaPatologica y Cirugia son campos de texto libre con sugerencias de lookup */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-violet-50 text-violet-800" icon={<Stethoscope size={14}/>} title="Prácticas Especiales" />
        <div className="px-4 py-1 bg-white">
          <TextSelectRow label="Anestesias"              value={d.anestesias}                  opciones={op('Anestesias')}         editing={editing} onChange={v => set('anestesias', v)} textarea />
          <TextSelectRow label="Anatomía Patológica"     value={d.anatomiaPatologica}          opciones={op('AnatomiaPatologica')} editing={editing} onChange={v => set('anatomiaPatologica', v)} textarea />
          <TextSelectRow label="Cirugía"                 value={d.cirugia}                     opciones={op('Cirugia')}            editing={editing} onChange={v => set('cirugia', v)} textarea />
          <SelectRow     label="Estudios Valor Cero"     value={d.estudiosValorCero}           opciones={op('EstudiosValorCero')}  editing={editing} onChange={id => set('estudiosValorCeroId', id)} />
          <FieldRow      label="Obs. Autorizaciones"     value={d.observacionesAutorizaciones} editing={editing} onChange={v => set('observacionesAutorizaciones', v)} textarea />
          <FieldRow      label="Horario OS"              value={d.horarioObraSocial}           editing={editing} onChange={v => set('horarioObraSocial', v)} textarea />
        </div>
      </div>

      {/* ══ FACTURACIÓN ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-orange-50 text-orange-800" icon={<Receipt size={14}/>} title="Facturación" />
        <div className="px-4 py-1 bg-white">
          <SelectRow label="Fecha Facturación"    value={d.fechaFacturacion}   opciones={op('FechaFacturacion')}   editing={editing} onChange={id => set('fechaFacturacionId', id)} />
          <SelectRow label="Documentación"        value={d.documentacion}     opciones={op('Documentacion')}     editing={editing} onChange={id => set('documentacionId', id)} />
          <SelectRow label="Modo Cierre"          value={d.modoCierre}        opciones={op('ModoCierre')}        editing={editing} onChange={id => set('modoCierreId', id)} />
          <SelectRow label="Copias Facturas"      value={d.copiasFacturas}    opciones={op('CopiasFacturas')}    editing={editing} onChange={id => set('copiasFacturasId', id)} />
          <SelectRow label="Dirección Entrega"    value={d.direccionEntrega}  opciones={op('DireccionEntrega')}  editing={editing} onChange={id => set('direccionEntregaId', id)} />
          <SelectRow label="Contacto Facturación" value={d.contactoFacturacion} opciones={op('ContactoFacturacion')} editing={editing} onChange={id => set('contactoFacturacionId', id)} />
          <BoolRow   label="Soporte Magnético"    value={d.soporteMagnetico}  editing={editing} onChange={v => set('soporteMagnetico', v)} />
          <BoolRow   label="Libre de Deuda"       value={d.libreDeDeuda}      editing={editing} onChange={v => set('libreDeDeuda', v)} />
          <BoolRow   label="Troquel Contrastes"   value={d.troquelContrastes} editing={editing} onChange={v => set('troquelContrastes', v)} />
          <SelectRow label="Laboratorio Factura"  value={d.laboratorioFactura} opciones={op('LaboratorioFactura')} editing={editing} onChange={id => set('laboratorioFacturaId', id)} />
        </div>
      </div>

      {/* ══ INFORMACIÓN ADICIONAL ══ */}
      <div className="rounded-xl border border-slate-100 overflow-hidden mb-3">
        <SectionHeader color="bg-slate-50 text-slate-600" icon={<Info size={14}/>} title="Información Adicional" />
        <div className="px-4 py-2 bg-white">
          {editing
            ? <textarea className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[80px]"
                value={form?.informacionAdicional ?? ''} onChange={e => set('informacionAdicional', e.target.value)} />
            : <p className={`text-sm py-2 whitespace-pre-wrap ${d.informacionAdicional ? 'text-slate-800' : 'text-slate-300 italic'}`}>
                {d.informacionAdicional || '—'}
              </p>
          }
        </div>
      </div>

      {/* ══ HISTORIAL DE CAMBIOS ══ */}
      {norma && (
        <div className="border-t border-slate-100 pt-3 mt-1">
          <button onClick={() => setAuditOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700">
            <History size={13} />
            Historial de cambios
            {auditOpen ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
          </button>
          {auditOpen && (
            <div className="mt-3 overflow-x-auto">
              {auditLogs.length === 0
                ? <p className="text-xs text-slate-400">Sin cambios registrados.</p>
                : (
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500">
                        {['Fecha','Usuario','Sección','Campo','Anterior','Nuevo'].map(h => (
                          <th key={h} className="px-2 py-1.5 text-left border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log: NormaOpAuditLog) => (
                        <tr key={log.id} className="hover:bg-slate-50 border-b border-slate-100">
                          <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{fmtDateTime(log.fechaHora)}</td>
                          <td className="px-2 py-1.5">{log.usuarioNombre}</td>
                          <td className="px-2 py-1.5 text-slate-500">{log.seccion}</td>
                          <td className="px-2 py-1.5 font-medium">{log.campo}</td>
                          <td className="px-2 py-1.5 text-red-600 max-w-[130px] truncate">{log.valorAnterior ?? '—'}</td>
                          <td className="px-2 py-1.5 text-emerald-700 max-w-[130px] truncate">{log.valorNuevo ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
              <div className="flex gap-4 text-xs text-slate-400 mt-2">
                {norma.creadoPor && <span>Creado por {norma.creadoPor} · {fmtDate(norma.fechaCreacion)}</span>}
                {norma.modificadoPor && <span>Última mod. {norma.modificadoPor} · {fmtDate(norma.fechaUltimaModificacion)}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
