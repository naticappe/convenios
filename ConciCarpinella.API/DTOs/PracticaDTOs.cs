// ============================================================
// DTOs — Módulo Prácticas Médicas
// ============================================================

using System.Text.Json;

namespace ConciCarpinella.API.DTOs;

// ── Resumen de concepto activo (chip en la grilla) ────────────
public class PracticaConceptoResumenDto
{
    public int    ConceptoId    { get; set; }
    public string ConceptoSigla { get; set; } = string.Empty;
    public string ConceptoNombre{ get; set; } = string.Empty;
}

// ── Lista principal ───────────────────────────────────────────
public class PracticaListDto
{
    public int     Id                     { get; set; }
    public string  Codigo                 { get; set; } = string.Empty;
    public string  Nombre                 { get; set; } = string.Empty;
    public int     NomencladorId          { get; set; }
    public string  NomencladorNombre      { get; set; } = string.Empty;
    public int?    ClasificadorPracticaId { get; set; }
    public string? ClasificadorNombre     { get; set; }
    public string  VigenciaDesde          { get; set; } = string.Empty;
    public string? VigenciaHasta          { get; set; }
    public bool    Activo                 { get; set; }
    public string  Estado                 => Activo ? "Activo" : "Inactivo";
    public List<PracticaConceptoResumenDto> Conceptos { get; set; } = new();
}

// ── Detalle completo ──────────────────────────────────────────
public class PracticaDto : PracticaListDto
{
    public string  CreatedAt { get; set; } = string.Empty;
    public string  UpdatedAt { get; set; } = string.Empty;
    public long?   CreatedBy { get; set; }
    public long?   UpdatedBy { get; set; }
    public List<PracticaConceptoUnidadDto> ConceptoUnidades { get; set; } = new();
}

// ── Vínculo Práctica-Concepto-Unidad (detalle) ───────────────
public class PracticaConceptoUnidadDto
{
    public int     Id                  { get; set; }
    public int     PracticaId          { get; set; }
    public int     ConceptoMaestroId   { get; set; }
    public string  ConceptoSigla       { get; set; } = string.Empty;
    public string  ConceptoNombre      { get; set; } = string.Empty;
    public int     UnidadArancelId     { get; set; }
    public string  UnidadArancelNombre { get; set; } = string.Empty;
    public decimal Unidades            { get; set; }
    public decimal Cantidad            { get; set; }
    public string  VigenciaDesde       { get; set; } = string.Empty;
    public string? VigenciaHasta       { get; set; }
    public bool    Activo              { get; set; }
}

// ── Crear / Editar práctica ───────────────────────────────────
public class CrearEditarPracticaDto
{
    public string     Codigo                 { get; set; } = string.Empty;
    public string     Nombre                 { get; set; } = string.Empty;
    public int        NomencladorId          { get; set; }
    public int?       ClasificadorPracticaId { get; set; }
    // Vigencia: opcional en alta. Si se omite VigenciaDesde, se usa DateTime.UtcNow.
    // Si se omite VigenciaHasta, la vigencia es indefinida.
    public DateTime?  VigenciaDesde          { get; set; }
    public DateTime?  VigenciaHasta          { get; set; }
}

// ── Actualizar vigencia ───────────────────────────────────────
public class ActualizarVigenciaPracticaDto
{
    public DateTime  VigenciaDesde { get; set; }
    public DateTime? VigenciaHasta { get; set; }
}

// ── Crear / Editar vínculo concepto-unidad ────────────────────
public class CrearEditarPracticaConceptoUnidadDto
{
    public int      ConceptoMaestroId { get; set; }
    public int      UnidadArancelId   { get; set; }
    public decimal  Unidades          { get; set; }
    public decimal  Cantidad          { get; set; }
    public DateTime  VigenciaDesde    { get; set; }
    public DateTime? VigenciaHasta    { get; set; }
}

// ── Auditoría ─────────────────────────────────────────────────
public class PracticaAuditLogDto
{
    public long    Id                        { get; set; }
    public int     PracticaId                { get; set; }
    public int?    PracticaConceptoUnidadId  { get; set; }
    public string  Accion                    { get; set; } = string.Empty;
    public string  Entidad                   { get; set; } = string.Empty;
    public string  FechaEvento               { get; set; } = string.Empty;
    public long?   UsuarioId                 { get; set; }
    public string  UsuarioNombre             { get; set; } = string.Empty;
    public string  Origen                    { get; set; } = string.Empty;
    public string? TransactionId             { get; set; }
    public JsonElement? DatosAnteriores      { get; set; }
    public JsonElement? DatosNuevos          { get; set; }
}

// ── Importación — preview row ─────────────────────────────────
public class PreviewPracticaRowDto
{
    public string  Codigo                 { get; set; } = string.Empty;
    public string  Nombre                 { get; set; } = string.Empty;
    public int     NomencladorId          { get; set; }
    public int?    ClasificadorPracticaId { get; set; }
    public string  VigenciaDesde          { get; set; } = string.Empty;
    public int?    IdExistente            { get; set; }
    public bool    EsNueva                { get; set; }
    public bool    HayDiferencia          { get; set; }
    public string? Error                  { get; set; }
}

public class PreviewDetalleRowDto
{
    public string  Codigo             { get; set; } = string.Empty;
    public int     NomencladorId      { get; set; }
    public int     ConceptoMaestroId  { get; set; }
    public int     UnidadArancelId    { get; set; }
    public decimal Unidades           { get; set; }
    public decimal Cantidad           { get; set; }
    public string  VigenciaDesde      { get; set; } = string.Empty;
    public string? Error              { get; set; }
}

public class PracticaImportPreviewDto
{
    public Guid                       TransactionId  { get; set; }
    public List<PreviewPracticaRowDto> FilasPracticas { get; set; } = new();
    public List<PreviewDetalleRowDto>  FilasDetalle   { get; set; } = new();
    public List<string>                Errores        { get; set; } = new();
}

// ── Importación — confirmar ───────────────────────────────────
public class ConfirmarImportacionPracticaDto
{
    public Guid                        TransactionId  { get; set; }
    public List<PreviewPracticaRowDto> FilasPracticas { get; set; } = new();
    public List<PreviewDetalleRowDto>  FilasDetalle   { get; set; } = new();
}
