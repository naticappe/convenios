// ============================================================
// MODELO: UnidadArancel
// Representa la unidad base de valorización arancelaria.
// Las prácticas de nomenclador se valorizan mediante estas unidades.
// No se permite borrado físico: se usa activo=false para baja lógica.
// ============================================================

namespace ConciCarpinella.API.Models;

public class UnidadArancel
{
    /// <summary>Identificador único (PK autoincrement)</summary>
    public int Id { get; set; }

    /// <summary>Nombre de la unidad arancel. Único en el maestro, obligatorio.</summary>
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Fecha desde la que está vigente (obligatoria)</summary>
    public DateOnly VigenciaDesde { get; set; }

    /// <summary>Fecha hasta la que está vigente (obligatoria, >= VigenciaDesde)</summary>
    public DateOnly VigenciaHasta { get; set; }

    /// <summary>Estado lógico: true = Vigente, false = Inactivo</summary>
    public bool Activo { get; set; } = true;

    /// <summary>Fecha de creación del registro</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que creó el registro</summary>
    public long? CreatedBy { get; set; }

    /// <summary>Fecha de última modificación</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que realizó la última modificación</summary>
    public long? UpdatedBy { get; set; }

    // ── Relaciones ───────────────────────────────────────────────
    public ICollection<UnidadArancelAuditLog> AuditLogs { get; set; } = new List<UnidadArancelAuditLog>();
}
