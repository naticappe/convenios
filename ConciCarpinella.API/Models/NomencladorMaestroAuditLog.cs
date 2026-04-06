// ============================================================
// MODELO: NomencladorMaestroAuditLog
// Registro completo de auditoría para el módulo NomencladorMaestro.
// Cada operación (alta, modificación, cambio de vigencia, importación)
// genera una entrada con los valores anteriores y nuevos.
// ============================================================

namespace ConciCarpinella.API.Models;

public class NomencladorMaestroAuditLog
{
    /// <summary>PK autoincremental (BIGSERIAL)</summary>
    public long Id { get; set; }

    /// <summary>FK al nomenclador afectado. CASCADE DELETE.</summary>
    public int NomencladorMaestroId { get; set; }

    /// <summary>
    /// Tipo de operación:
    /// ALTA | MODIFICACION | BAJA_LOGICA | CAMBIO_VIGENCIA | IMPORTACION
    /// </summary>
    public string Accion { get; set; } = string.Empty;

    /// <summary>Fecha y hora del evento (UTC)</summary>
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que realizó la operación</summary>
    public long? UsuarioId { get; set; }

    /// <summary>Nombre completo del usuario (snapshot para trazabilidad)</summary>
    public string UsuarioNombre { get; set; } = string.Empty;

    /// <summary>Origen de la operación: MANUAL | IMPORTACION | SISTEMA</summary>
    public string Origen { get; set; } = "MANUAL";

    /// <summary>UUID para agrupar múltiples registros de una importación masiva</summary>
    public Guid? TransactionId { get; set; }

    // ── Valores anteriores ───────────────────────────────────────
    public string?  NombreAnterior            { get; set; }
    public DateOnly? VigenciaDesdeAnterior    { get; set; }
    public DateOnly? VigenciaHastaAnterior    { get; set; }
    public bool?    ActivoAnterior            { get; set; }

    // ── Valores nuevos ───────────────────────────────────────────
    public string?  NombreNuevo              { get; set; }
    public DateOnly? VigenciaDesdeNuevo      { get; set; }
    public DateOnly? VigenciaHastaNuevo      { get; set; }
    public bool?    ActivoNuevo              { get; set; }

    /// <summary>Snapshot JSON del estado anterior completo</summary>
    public string? DatosAnteriores { get; set; }

    /// <summary>Snapshot JSON del estado nuevo completo</summary>
    public string? DatosNuevos { get; set; }

    // ── Relaciones ───────────────────────────────────────────────
    public NomencladorMaestro NomencladorMaestro { get; set; } = null!;
}
