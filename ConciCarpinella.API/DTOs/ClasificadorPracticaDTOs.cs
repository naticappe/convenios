// ============================================================
// DTOs: ClasificadorPractica
// Todos los DTOs del módulo Clasificador de Prácticas.
// ============================================================

namespace ConciCarpinella.API.DTOs;

// ── Lista ────────────────────────────────────────────────────
public class ClasificadorPracticaListDto
{
    public int    Id       { get; set; }
    public string Nivel1   { get; set; } = string.Empty;
    public string Nivel2   { get; set; } = string.Empty;
    public string Nivel3   { get; set; } = string.Empty;
    public bool   Activo   { get; set; }
    public string Estado   { get; set; } = string.Empty;   // "Activo" | "Inactivo"
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

// ── Detalle completo ─────────────────────────────────────────
public class ClasificadorPracticaDto : ClasificadorPracticaListDto
{
    public long? CreatedBy { get; set; }
    public long? UpdatedBy { get; set; }
}

// ── Crear / Editar ───────────────────────────────────────────
public class CrearEditarClasificadorPracticaDto
{
    public string Nivel1 { get; set; } = string.Empty;
    public string Nivel2 { get; set; } = string.Empty;
    public string Nivel3 { get; set; } = string.Empty;
}

// ── Actualizar Estado ────────────────────────────────────────
public class ActualizarEstadoClasificadorDto
{
    public bool Activo { get; set; }
}

// ── AuditLog ─────────────────────────────────────────────────
public class ClasificadorPracticaAuditLogDto
{
    public long   Id                    { get; set; }
    public int    ClasificadorPracticaId { get; set; }
    public string Accion                { get; set; } = string.Empty;
    public string FechaEvento           { get; set; } = string.Empty;
    public long?  UsuarioId             { get; set; }
    public string UsuarioNombre         { get; set; } = string.Empty;
    public string Origen                { get; set; } = string.Empty;
    public Guid?  TransactionId         { get; set; }

    // Snapshot de la clave del registro auditado
    public string? Nivel1Clasificador   { get; set; }
    public string? Nivel2Clasificador   { get; set; }
    public string? Nivel3Clasificador   { get; set; }

    // Valores anteriores
    public string? Nivel1Anterior { get; set; }
    public string? Nivel2Anterior { get; set; }
    public string? Nivel3Anterior { get; set; }
    public bool?   ActivoAnterior { get; set; }

    // Valores nuevos
    public string? Nivel1Nuevo { get; set; }
    public string? Nivel2Nuevo { get; set; }
    public string? Nivel3Nuevo { get; set; }
    public bool?   ActivoNuevo { get; set; }

    public string? DatosAnteriores { get; set; }
    public string? DatosNuevos     { get; set; }
}

// ── Import Preview ───────────────────────────────────────────
public class ClasificadorPracticaImportPreviewDto
{
    public Guid TransactionId { get; set; }
    public List<ClasificadorPracticaImportPreviewRowDto> Filas { get; set; } = new();
}

public class ClasificadorPracticaImportPreviewRowDto
{
    // Datos del Excel
    public string Nivel1Import { get; set; } = string.Empty;
    public string Nivel2Import { get; set; } = string.Empty;
    public string Nivel3Import { get; set; } = string.Empty;
    public bool   ActivoImport { get; set; } = true;

    // Datos existentes en BD (null si es nueva)
    public int?   IdExistente  { get; set; }
    public bool?  ActivoActual { get; set; }

    // Flags
    public bool EsNueva       { get; set; }
    public bool HayDiferencia { get; set; }   // true si el estado difiere del actual
}

// ── Confirmar Importación ────────────────────────────────────
public class ConfirmarClasificadorImportacionDto
{
    public Guid TransactionId { get; set; }
    public List<ClasificadorPracticaImportRowDto> Filas { get; set; } = new();
}

public class ClasificadorPracticaImportRowDto
{
    public int?   Id     { get; set; }           // Opcional: ID del registro existente (col A del Excel)
    public string Nivel1  { get; set; } = string.Empty;
    public string Nivel2  { get; set; } = string.Empty;
    public string Nivel3  { get; set; } = string.Empty;
    public bool   Activo  { get; set; } = true;
}
