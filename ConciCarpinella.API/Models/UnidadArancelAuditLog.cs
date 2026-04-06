// ============================================================
// MODELO: UnidadArancelAuditLog
// Registro completo de auditoría para el módulo UnidadArancel.
// Cada operación (alta, modificación, baja lógica, importación)
// genera una entrada en este log con los valores anteriores y nuevos.
// ============================================================

namespace ConciCarpinella.API.Models;

public class UnidadArancelAuditLog
{
    /// <summary>PK autoincremental (BIGSERIAL)</summary>
    public long Id { get; set; }

    /// <summary>FK a la unidad arancel afectada</summary>
    public int UnidadArancelId { get; set; }

    /// <summary>
    /// Tipo de operación: ALTA, MODIFICACION, BAJA_LOGICA, CAMBIO_VIGENCIA,
    /// CAMBIO_ESTADO, IMPORTACION
    /// </summary>
    public string Accion { get; set; } = string.Empty;

    /// <summary>Fecha y hora del evento (con timezone)</summary>
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que realizó la operación</summary>
    public long? UsuarioId { get; set; }

    /// <summary>Nombre completo del usuario (snapshot para trazabilidad)</summary>
    public string UsuarioNombre { get; set; } = string.Empty;

    /// <summary>Origen de la operación: MANUAL, IMPORTACION</summary>
    public string Origen { get; set; } = "MANUAL";

    /// <summary>ID de transacción UUID para operaciones de importación masiva</summary>
    public Guid? TransactionId { get; set; }

    // ── Valores anteriores ───────────────────────────────────────
    public string? NombreAnterior       { get; set; }
    public DateOnly? VigenciaDesdeAnterior { get; set; }
    public DateOnly? VigenciaHastaAnterior { get; set; }
    public bool?   ActivoAnterior       { get; set; }

    // ── Valores nuevos ───────────────────────────────────────────
    public string? NombreNuevo          { get; set; }
    public DateOnly? VigenciaDesdeNuevo    { get; set; }
    public DateOnly? VigenciaHastaNuevo    { get; set; }
    public bool?   ActivoNuevo          { get; set; }

    /// <summary>Snapshot JSON de los datos anteriores (campo completo)</summary>
    public string? DatosAnteriores { get; set; }  // JSONB en PG, guardado como string

    /// <summary>Snapshot JSON de los datos nuevos (campo completo)</summary>
    public string? DatosNuevos { get; set; }      // JSONB en PG, guardado como string

    // ── Relaciones ───────────────────────────────────────────────
    public UnidadArancel UnidadArancel { get; set; } = null!;
}
