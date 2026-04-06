// ============================================================
// DTOs: UnidadArancel
// Objetos de transferencia de datos para el módulo Unidad Arancel.
// ============================================================

namespace ConciCarpinella.API.DTOs;

// ── Lista resumida ────────────────────────────────────────────
public class UnidadArancelListDto
{
    public int     Id            { get; set; }
    public string  Nombre        { get; set; } = string.Empty;
    public string  VigenciaDesde { get; set; } = string.Empty;  // "yyyy-MM-dd"
    public string  VigenciaHasta { get; set; } = string.Empty;  // "yyyy-MM-dd"
    public bool    Activo        { get; set; }
    /// <summary>Derivado: "Vigente" | "Inactivo"</summary>
    public string  Estado        { get; set; } = string.Empty;
    public string  CreatedAt     { get; set; } = string.Empty;
    public string? UpdatedAt     { get; set; }
}

// ── Detalle completo ─────────────────────────────────────────
public class UnidadArancelDto : UnidadArancelListDto
{
    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
}

// ── Crear / Editar ───────────────────────────────────────────
public class CrearEditarUnidadArancelDto
{
    /// <summary>Nombre único, obligatorio, max 150 chars</summary>
    public string Nombre        { get; set; } = string.Empty;
    /// <summary>Fecha de inicio de vigencia "yyyy-MM-dd"</summary>
    public string VigenciaDesde { get; set; } = string.Empty;
    /// <summary>Fecha de fin de vigencia "yyyy-MM-dd"</summary>
    public string VigenciaHasta { get; set; } = string.Empty;
}

// ── PATCH vigencia ───────────────────────────────────────────
public class ActualizarVigenciaDto
{
    public string VigenciaDesde { get; set; } = string.Empty;
    public string VigenciaHasta { get; set; } = string.Empty;
}

// ── PATCH estado ────────────────────────────────────────────
public class ActualizarEstadoDto
{
    public bool Activo { get; set; }
}

// ── Auditoría ────────────────────────────────────────────────
public class UnidadArancelAuditLogDto
{
    public long    Id               { get; set; }
    public int     UnidadArancelId  { get; set; }
    public string  NombreUnidad     { get; set; } = string.Empty;
    public string  Accion           { get; set; } = string.Empty;
    public string  FechaEvento      { get; set; } = string.Empty;
    public long?   UsuarioId        { get; set; }
    public string  UsuarioNombre    { get; set; } = string.Empty;
    public string  Origen           { get; set; } = string.Empty;
    public Guid?   TransactionId    { get; set; }

    // Anteriores
    public string? NombreAnterior          { get; set; }
    public string? VigenciaDesdeAnterior   { get; set; }
    public string? VigenciaHastaAnterior   { get; set; }
    public bool?   ActivoAnterior          { get; set; }

    // Nuevos
    public string? NombreNuevo             { get; set; }
    public string? VigenciaDesdeNuevo      { get; set; }
    public string? VigenciaHastaNuevo      { get; set; }
    public bool?   ActivoNuevo             { get; set; }

    public string? DatosAnteriores { get; set; }
    public string? DatosNuevos     { get; set; }
}

// ── Import / Export ───────────────────────────────────────────
/// <summary>Fila del Excel que se sube para importar</summary>
public class UnidadArancelImportRowDto
{
    public string  Nombre        { get; set; } = string.Empty;
    public string  VigenciaDesde { get; set; } = string.Empty;
    public string  VigenciaHasta { get; set; } = string.Empty;
}

/// <summary>Resultado de la previsualización antes de confirmar importación</summary>
public class UnidadArancelImportPreviewDto
{
    public Guid TransactionId { get; set; }
    public List<UnidadArancelImportPreviewRowDto> Filas { get; set; } = new();
}

/// <summary>Fila de previsualización comparativa</summary>
public class UnidadArancelImportPreviewRowDto
{
    // Qué trae el archivo
    public string  NombreImport        { get; set; } = string.Empty;
    public string  VigenciaDesdeImport { get; set; } = string.Empty;
    public string  VigenciaHastaImport { get; set; } = string.Empty;

    // Qué hay actualmente en la base (null si es nueva)
    public int?    IdExistente          { get; set; }
    public string? NombreActual         { get; set; }
    public string? VigenciaDesdeActual  { get; set; }
    public string? VigenciaHastaActual  { get; set; }
    public bool?   ActivoActual         { get; set; }

    // Flags de diferencias
    public bool HayDiferenciaNombre   { get; set; }
    public bool HayDiferenciaVigencia { get; set; }
    public bool EsNueva               { get; set; }
}

/// <summary>Request para confirmar una importación previamente previsualizada</summary>
public class ConfirmarImportacionDto
{
    public Guid TransactionId { get; set; }
    public List<UnidadArancelImportRowDto> Filas { get; set; } = new();
}
