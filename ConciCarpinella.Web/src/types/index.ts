// ============================================================
// TIPOS DE TYPESCRIPT
// Define las estructuras de datos que usa toda la aplicación.
// Esto permite que el editor avise si se usa un dato incorrecto.
// ============================================================

// ── Autenticación ─────────────────────────────────────────────
export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAcceso?: string;
}

export type RolUsuario = 'Admin' | 'DataEntry' | 'Analista' | 'Secretario';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

// ── Obras Sociales ────────────────────────────────────────────
export type EstadoObraSocial = 'Activa' | 'Suspendida' | 'Baja'

export interface ObraSocialList {
  id: number;
  codigo: number;
  sigla?: string;
  nombre: string;
  cuit?: string;
  cantidadPlanes: number;
  estado: EstadoObraSocial;
}

export interface ObraSocial extends ObraSocialList {
  observaciones?: string;
  fechaCreacion: string;
  planes: PlanList[];
}

export interface CrearEditarObraSocial {
  codigo: number;
  sigla?: string;
  nombre: string;
  cuit?: string;
  observaciones?: string;
}

// ── Contactos de Obra Social ───────────────────────────────────
export interface ContactoObraSocial {
  id: number;
  obraSocialId: number;
  nombre: string;
  descripcion?: string;
  telefono?: string;
  mail?: string;
}

export interface CrearEditarContactoObraSocial {
  nombre: string;
  descripcion?: string;
  telefono?: string;
  mail?: string;
}

// ── Vigencias de Obra Social ───────────────────────────────────
export interface VigenciaObraSocial {
  id: number;
  obraSocialId: number;
  estado: EstadoObraSocial;
  fechaDesde: string;
  fechaHasta?: string;
  observaciones?: string;
}

export interface CrearVigenciaObraSocial {
  estado: EstadoObraSocial;
  fechaDesde: string;
  observaciones?: string;
}

// ── Planes ────────────────────────────────────────────────────
export type EstadoPlan  = 'Activo' | 'Baja'
export type TipoIva     = 'Exento' | 'Gravado105' | 'Gravado21'

export interface PlanList {
  id: number;
  nombre: string;
  alias?: string;
  tipoIva: TipoIva;
  obraSocial: string;
  obraSocialId: number;
  estado: EstadoPlan;
  esAutogestion: boolean;
}

export interface PlanDetalle extends PlanList {
  descripcion?: string;
  fechaCreacion: string;
}

export interface CrearEditarPlan {
  nombre: string;
  alias?: string;
  descripcion?: string;
  tipoIva: TipoIva;
  obraSocialId: number;
  esAutogestion: boolean;
  fechaDesde: string;
  fechaHasta?: string;
}

export interface VigenciaPlan {
  id: number;
  planId: number;
  estado: EstadoPlan;
  fechaDesde: string;
  fechaHasta?: string;
  observaciones?: string;
}

export interface CrearVigenciaPlan {
  estado: EstadoPlan;
  fechaDesde: string;
  observaciones?: string;
}

// ── Prácticas Médicas ─────────────────────────────────────────

export type EstadoPractica = 'Activo' | 'Inactivo'

export interface PracticaConceptoResumen {
  conceptoId:     number;
  conceptoSigla:  string;
  conceptoNombre: string;
}

export interface PracticaList {
  id:                     number;
  codigo:                 string;
  nombre:                 string;
  nomencladorId:          number;
  nomencladorNombre:      string;
  clasificadorPracticaId?: number;
  clasificadorNombre?:    string;
  vigenciaDesde:          string;
  vigenciaHasta?:         string;
  activo:                 boolean;
  estado:                 EstadoPractica;
  conceptos:              PracticaConceptoResumen[];
}

export interface PracticaConceptoUnidad {
  id:                  number;
  practicaId:          number;
  conceptoMaestroId:   number;
  conceptoSigla:       string;
  conceptoNombre:      string;
  unidadArancelId:     number;
  unidadArancelNombre: string;
  unidades:            number;
  cantidad:            number;
  vigenciaDesde:       string;
  vigenciaHasta?:      string;
  activo:              boolean;
}

export interface Practica extends PracticaList {
  createdAt:       string;
  updatedAt:       string;
  createdBy?:      number;
  updatedBy?:      number;
  conceptoUnidades: PracticaConceptoUnidad[];
}

export interface CrearEditarPractica {
  codigo:                 string;
  nombre:                 string;
  nomencladorId:          number;
  clasificadorPracticaId?: number;
  // Vigencia: solo se usa al dar de alta. Si vigenciaHasta queda vacío = vigencia indefinida.
  vigenciaDesde?:         string;
  vigenciaHasta?:         string;
}

export interface ActualizarVigenciaPractica {
  vigenciaDesde: string;
  vigenciaHasta?: string;
}

export interface CrearEditarPracticaConceptoUnidad {
  conceptoMaestroId: number;
  unidadArancelId:   number;
  unidades:          number;
  cantidad:          number;
  vigenciaDesde:     string;
  vigenciaHasta?:    string;
}

export interface PracticaAuditLog {
  id:                       number;
  practicaId:               number;
  practicaConceptoUnidadId?: number;
  accion:                   string;
  entidad:                  string;
  fechaEvento:              string;
  usuarioId?:               number;
  usuarioNombre:            string;
  origen:                   string;
  transactionId?:           string;
  datosAnteriores?:         Record<string, unknown>;
  datosNuevos?:             Record<string, unknown>;
}

// Import preview
export interface PracticaImportPreview {
  transactionId:  string;
  filasPracticas: PracticaPreviewRow[];
  filasDetalle:   PracticaDetallePreviewRow[];
  errores:        string[];
}

export interface PracticaPreviewRow {
  codigo:                  string;
  nombre:                  string;
  nomencladorId:           number;
  clasificadorPracticaId?: number;
  vigenciaDesde:           string;
  idExistente?:            number;
  esNueva:                 boolean;
  hayDiferencia:           boolean;
  error?:                  string;
}

export interface PracticaDetallePreviewRow {
  codigo:            string;
  nomencladorId:     number;
  conceptoMaestroId: number;
  unidadArancelId:   number;
  unidades:          number;
  cantidad:          number;
  vigenciaDesde:     string;
  error?:            string;
}

export interface ConfirmarImportacionPractica {
  transactionId:  string;
  filasPracticas: PracticaPreviewRow[];
  filasDetalle:   PracticaDetallePreviewRow[];
}

// ── Autorizaciones ────────────────────────────────────────────
export type EstadoAutorizacion = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Vencida' | 'Utilizada';

export interface AutorizacionList {
  id: number;
  numero: string;
  paciente: string;
  practica: string;
  plan: string;
  obraSocial: string;
  estado: EstadoAutorizacion;
  fechaSolicitud: string;
  fechaVencimiento?: string;
}

export interface Autorizacion {
  id: number;
  numero: string;
  nombrePaciente: string;
  apellidoPaciente: string;
  dniPaciente?: string;
  numeroAfiliado?: string;
  diagnostico?: string;
  estado: EstadoAutorizacion;
  fechaSolicitud: string;
  fechaVencimiento?: string;
  fechaUtilizacion?: string;
  cantidadAutorizada?: number;
  observaciones?: string;
  planId: number;
  plan: string;
  obraSocial: string;
  practicaId: number;
  practica: string;
  codigoPractica: string;
}

// ── Respuesta paginada genérica ───────────────────────────────
export interface PaginadoResponse<T> {
  items: T[];
  total: number;
  pagina: number;
  porPagina: number;
}

// ── Estado del color de un badge de estado ────────────────────
export type ColorBadge = 'verde' | 'rojo' | 'amarillo' | 'azul' | 'gris';

// ── Valores — Importador ──────────────────────────────────────

export interface ImportacionValores {
  id: number;
  nombreArchivo: string;
  vigenciaDesde: string;
  fechaCreacion: string;
  aplicada: boolean;
  cantidadItems: number;
}

export interface EtlConfig {
  filaEncabezado: number;
  filasDatoDesde: number;
  colCodigoExterno: number;
  colCodigo: number;
  colDescripcion: number;
  colValor: string;
  prefijoColfin: string;
  omitirCodVacio: boolean;
  omitirValorCero: boolean;
}

export interface FilaExcluida {
  numeroFila: number;
  codigo: string;
  descripcion: string;
  motivo: string;
}

export interface ParsearImportacionResponse {
  importacionId: number;
  nombreArchivo: string;
  etlPasos: string[];
  totalFilas: number;
  filasValidas: number;
  filasIgnoradas: number;
  items: ParsearItem[];
  filasExcluidas: FilaExcluida[];
  configUsada: EtlConfig;
}

export interface ParsearItem {
  codigoPractica: string;
  codigoExterno: string;
  descripcion: string;
  valorNuevo: number;
  valorActual: number | null;
  diferencia: number | null;
  diferenciaPorcentaje: number | null;
  estado: 'igual' | 'mayor' | 'menor' | 'nuevo';
}

export interface AplicarImportacionResponse {
  codigosAplicados: number;
  planesActualizados: number;
  practicasCreadas: number;
  advertencias: string[];
}

// ── Valores — Matriz ──────────────────────────────────────────

export interface MatrizResponse {
  planes: { id: number; nombre: string }[];
  practicas: {
    codigo: string;
    descripcion: string;
    valores: (number | null)[];
    cantidadPlanes: number;
  }[];
}

// ── Valores — Historial ───────────────────────────────────────

export interface HistorialPracticaItem {
  codigo:      string;
  descripcion: string;
  historial:   (number | null)[];
}

export interface HistorialPlanItem {
  id:                number;
  nombre:            string;
  variacionPromedio: (number | null)[];
  practicas:         HistorialPracticaItem[];
}

export interface HistorialResponse {
  periodos: string[];
  planes:   HistorialPlanItem[];
}

// ── Normas Operativas ─────────────────────────────────────────

export interface NormaOpOpcion {
  id:          number;
  descripcion: string;
  categoria:   string;
  orden:       number;
}

export type NormaOpOpciones = Record<string, NormaOpOpcion[]>;

export interface NormaOperativa {
  id:                           number;
  obraSocialId?:                number;
  obraSocialNombre?:            string;
  nombreOs:                     string;
  codigoOs?:                    number;
  linkDrive?:                   string;
  coseguros?:                   string;
  tipoOrden?:                   NormaOpOpcion;
  vigenciaOrden?:               NormaOpOpcion;
  fechaCalculoVigencia?:        NormaOpOpcion;
  aceptaPedidoDigitalPreimpreso?: string;
  aceptaPedidoFirmaDigital?:    boolean;
  requiereAutorizacionExpresa?: string;
  aceptaRpDigital?:             string;
  tipoAutorizacion?:            string;
  formatoAutorizacion?:         string;
  aceptaFotocopiaRp?:           string;
  carnetDiscapacidadOncologico?: string;
  paginaObraSocial?:            string;
  usuario?:                     string;
  contrasena?:                  string;
  linkInstructivo?:             string;
  fechaAutorizacion?:           string;
  medicoNoAparece?:             string;
  efectorImagen?:               NormaOpOpcion;
  efectorConsultas?:            NormaOpOpcion;
  efectorOftalmologia?:         NormaOpOpcion;
  efectorOtras?:                NormaOpOpcion;
  efectorNoAparece?:            string;
  anestesias?:                  string;
  anatomiaPatologica?:          string;
  cirugia?:                     string;
  estudiosValorCero?:           NormaOpOpcion;
  observacionesAutorizaciones?: string;
  horarioObraSocial?:           string;
  fechaFacturacion?:            NormaOpOpcion;
  documentacion?:               NormaOpOpcion;
  modoCierre?:                  NormaOpOpcion;
  copiasFacturas?:              NormaOpOpcion;
  direccionEntrega?:            NormaOpOpcion;
  contactoFacturacion?:         NormaOpOpcion;
  soporteMagnetico?:            boolean;
  libreDeDeuda?:                boolean;
  troquelContrastes?:           boolean;
  laboratorioFactura?:          NormaOpOpcion;
  informacionAdicional?:        string;
  fechaCreacion:                string;
  fechaUltimaModificacion?:     string;
  creadoPor?:                   string;
  modificadoPor?:               string;
}

export interface UpsertNormaOperativa {
  obraSocialId?:                number;
  nombreOs:                     string;
  codigoOs?:                    number;
  linkDrive?:                   string;
  coseguros?:                   string;
  tipoOrdenId?:                 number;
  vigenciaOrdenId?:             number;
  fechaCalculoVigenciaId?:      number;
  aceptaPedidoDigitalPreimpreso?: string;
  aceptaPedidoFirmaDigital?:    boolean;
  requiereAutorizacionExpresa?: string;
  aceptaRpDigital?:             string;
  tipoAutorizacion?:            string;
  formatoAutorizacion?:         string;
  aceptaFotocopiaRp?:           string;
  carnetDiscapacidadOncologico?: string;
  paginaObraSocial?:            string;
  usuario?:                     string;
  contrasena?:                  string;
  linkInstructivo?:             string;
  fechaAutorizacion?:           string;
  medicoNoAparece?:             string;
  efectorImagenId?:             number;
  efectorConsultasId?:          number;
  efectorOftalmologiaId?:       number;
  efectorOtrasId?:              number;
  efectorNoAparece?:            string;
  anestesias?:                  string;
  anatomiaPatologica?:          string;
  cirugia?:                     string;
  estudiosValorCeroId?:         number;
  observacionesAutorizaciones?: string;
  horarioObraSocial?:           string;
  fechaFacturacionId?:          number;
  documentacionId?:             number;
  modoCierreId?:                number;
  copiasFacturasId?:            number;
  direccionEntregaId?:          number;
  contactoFacturacionId?:       number;
  soporteMagnetico?:            boolean;
  libreDeDeuda?:                boolean;
  troquelContrastes?:           boolean;
  laboratorioFacturaId?:        number;
  informacionAdicional?:        string;
}

export interface NormaOpAuditLog {
  id:            number;
  normaId:       number;
  campo:         string;
  seccion:       string;
  valorAnterior?: string;
  valorNuevo?:   string;
  usuarioNombre: string;
  fechaHora:     string;
}

// ── Unidad Arancel ────────────────────────────────────────────
export type EstadoUnidadArancel = 'Vigente' | 'Inactivo'

export interface UnidadArancelList {
  id:            number;
  nombre:        string;
  vigenciaDesde: string;  // "yyyy-MM-dd"
  vigenciaHasta: string;  // "yyyy-MM-dd"
  activo:        boolean;
  estado:        EstadoUnidadArancel;
  createdAt:     string;
  updatedAt?:    string;
}

export interface UnidadArancel extends UnidadArancelList {
  createdBy?: number;
  updatedBy?: number;
}

export interface CrearEditarUnidadArancel {
  nombre:        string;
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarVigenciaUA {
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarEstadoUA {
  activo: boolean;
}

// Auditoría
export interface UnidadArancelAuditLog {
  id:               number;
  unidadArancelId:  number;
  nombreUnidad:     string;
  accion:           string;
  fechaEvento:      string;
  usuarioId?:       number;
  usuarioNombre:    string;
  origen:           string;
  transactionId?:   string;
  nombreAnterior?:         string;
  vigenciaDesdeAnterior?:  string;
  vigenciaHastaAnterior?:  string;
  activoAnterior?:         boolean;
  nombreNuevo?:            string;
  vigenciaDesdeNuevo?:     string;
  vigenciaHastaNuevo?:     string;
  activoNuevo?:            boolean;
  datosAnteriores?:        string;
  datosNuevos?:            string;
}

// Import preview
export interface UnidadArancelImportPreview {
  transactionId: string;
  filas: UnidadArancelImportPreviewRow[];
}

export interface UnidadArancelImportPreviewRow {
  nombreImport:        string;
  vigenciaDesdeImport: string;
  vigenciaHastaImport: string;
  idExistente?:        number;
  nombreActual?:       string;
  vigenciaDesdeActual?: string;
  vigenciaHastaActual?: string;
  activoActual?:       boolean;
  hayDiferenciaNombre:   boolean;
  hayDiferenciaVigencia: boolean;
  esNueva:               boolean;
}

// ── NomencladorMaestro ────────────────────────────────────────
export type EstadoNomencladorMaestro = 'Vigente' | 'Inactivo'

export interface NomencladorMaestroList {
  id:            number;
  nombre:        string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  activo:        boolean;
  estado:        EstadoNomencladorMaestro;
  createdAt:     string;
  updatedAt:     string;
}

export interface NomencladorMaestro extends NomencladorMaestroList {
  createdBy?: number;
  updatedBy?: number;
}

export interface CrearEditarNomencladorMaestro {
  nombre:        string;
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarVigenciaNomenclador {
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarEstadoNomenclador {
  activo: boolean;
}

export interface NomencladorMaestroAuditLog {
  id:                   number;
  nomencladorMaestroId: number;
  nombreNomenclador:    string;
  accion:               string;
  fechaEvento:          string;
  usuarioId?:           number;
  usuarioNombre:        string;
  origen:               string;
  transactionId?:       string;
  nombreAnterior?:         string;
  vigenciaDesdeAnterior?:  string;
  vigenciaHastaAnterior?:  string;
  activoAnterior?:         boolean;
  nombreNuevo?:            string;
  vigenciaDesdeNuevo?:     string;
  vigenciaHastaNuevo?:     string;
  activoNuevo?:            boolean;
  datosAnteriores?:        string;
  datosNuevos?:            string;
}

export interface NomencladorMaestroImportPreview {
  transactionId: string;
  filas:         NomencladorMaestroImportPreviewRow[];
}

export interface NomencladorMaestroImportPreviewRow {
  nombreImport:        string;
  vigenciaDesdeImport: string;
  vigenciaHastaImport: string;
  idExistente?:        number;
  nombreActual?:       string;
  vigenciaDesdeActual?: string;
  vigenciaHastaActual?: string;
  activoActual?:       boolean;
  hayDiferenciaNombre:   boolean;
  hayDiferenciaVigencia: boolean;
  esNueva:               boolean;
}

// ── ConceptoMaestro ───────────────────────────────────────────
export type EstadoConceptoMaestro = 'Vigente' | 'Inactivo'

export interface ConceptoMaestroList {
  id:            number;
  nombre:        string;
  sigla:         string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  activo:        boolean;
  estado:        EstadoConceptoMaestro;
  createdAt:     string;
  updatedAt:     string;
}

export interface ConceptoMaestro extends ConceptoMaestroList {
  createdBy?: number;
  updatedBy?: number;
}

export interface CrearEditarConceptoMaestro {
  nombre:        string;
  sigla:         string;
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarVigenciaConcepto {
  vigenciaDesde: string;
  vigenciaHasta: string;
}

export interface ActualizarEstadoConcepto {
  activo: boolean;
}

export interface ConceptoMaestroAuditLog {
  id:                number;
  conceptoMaestroId: number;
  nombreConcepto:    string;
  accion:            string;
  fechaEvento:       string;
  usuarioId?:        number;
  usuarioNombre:     string;
  origen:            string;
  transactionId?:    string;
  nombreAnterior?:         string;
  siglaAnterior?:          string;
  vigenciaDesdeAnterior?:  string;
  vigenciaHastaAnterior?:  string;
  activoAnterior?:         boolean;
  nombreNuevo?:            string;
  siglaNueva?:             string;
  vigenciaDesdeNuevo?:     string;
  vigenciaHastaNuevo?:     string;
  activoNuevo?:            boolean;
  datosAnteriores?:        string;
  datosNuevos?:            string;
}

export interface ConceptoMaestroImportPreview {
  transactionId: string;
  filas:         ConceptoMaestroImportPreviewRow[];
}

export interface ConceptoMaestroImportPreviewRow {
  nombreImport:        string;
  siglaImport:         string;
  vigenciaDesdeImport: string;
  vigenciaHastaImport: string;
  idExistente?:        number;
  nombreActual?:       string;
  siglaActual?:        string;
  vigenciaDesdeActual?: string;
  vigenciaHastaActual?: string;
  activoActual?:       boolean;
  hayDiferenciaNombre:   boolean;
  hayDiferenciaSigla:    boolean;
  hayDiferenciaVigencia: boolean;
  esNuevo:               boolean;
}


// ── Clasificador de Prácticas ─────────────────────────────────

export type EstadoClasificador = 'Activo' | 'Inactivo'

export interface ClasificadorPracticaList {
  id:        number;
  nivel1:    string;
  nivel2:    string;
  nivel3:    string;
  activo:    boolean;
  estado:    EstadoClasificador;
  createdAt: string;
  updatedAt: string;
}

export interface ClasificadorPractica extends ClasificadorPracticaList {
  createdBy?: number;
  updatedBy?: number;
}

export interface CrearEditarClasificadorPractica {
  nivel1: string;
  nivel2: string;
  nivel3: string;
}

export interface ClasificadorPracticaAuditLog {
  id:                     number;
  clasificadorPracticaId: number;
  nivel1Clasificador?:    string;
  nivel2Clasificador?:    string;
  nivel3Clasificador?:    string;
  accion:                 string;
  fechaEvento:            string;
  usuarioId?:             number;
  usuarioNombre:          string;
  origen:                 string;
  transactionId?:         string;
  nivel1Anterior?:        string;
  nivel2Anterior?:        string;
  nivel3Anterior?:        string;
  activoAnterior?:        boolean;
  nivel1Nuevo?:           string;
  nivel2Nuevo?:           string;
  nivel3Nuevo?:           string;
  activoNuevo?:           boolean;
  datosAnteriores?:       string;
  datosNuevos?:           string;
}

export interface ClasificadorPracticaImportPreview {
  transactionId: string;
  filas:         ClasificadorPracticaImportPreviewRow[];
}

export interface ClasificadorPracticaImportPreviewRow {
  nivel1Import:  string;
  nivel2Import:  string;
  nivel3Import:  string;
  activoImport:  boolean;
  idExistente?:  number;
  activoActual?: boolean;
  esNueva:       boolean;
  hayDiferencia: boolean;
}

export interface ConfirmarClasificadorImportacion {
  transactionId: string;
  filas: {
    nivel1:  string;
    nivel2:  string;
    nivel3:  string;
    activo:  boolean;
  }[];
}
