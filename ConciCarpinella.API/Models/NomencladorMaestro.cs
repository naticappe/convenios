// ============================================================
// MODELO: NomencladorMaestro
// Gestiona los tipos de nomencladores usados para prácticas médicas.
// Cada nomenclador tiene un nombre único y un rango de vigencia por fechas.
// El campo Activo se deriva automáticamente de VigenciaHasta.
// No se permite borrado físico: se gestiona mediante vigencias.
// ============================================================

namespace ConciCarpinella.API.Models;

public class NomencladorMaestro
{
    /// <summary>Identificador único (PK autoincrement)</summary>
    public int Id { get; set; }

    /// <summary>Nombre descriptivo del nomenclador. Único en el maestro, obligatorio.</summary>
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Fecha desde la que está vigente (obligatoria)</summary>
    public DateOnly VigenciaDesde { get; set; }

    /// <summary>
    /// Fecha hasta la que está vigente (obligatoria).
    /// 9999-12-31 = vigente indefinidamente.
    /// </summary>
    public DateOnly VigenciaHasta { get; set; }

    /// <summary>
    /// Derivado de VigenciaHasta >= hoy.
    /// NO se setea directamente, siempre se recalcula.
    /// </summary>
    public bool Activo { get; set; } = true;

    /// <summary>Fecha de creación del registro (UTC)</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Fecha de última modificación (UTC)</summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que creó el registro</summary>
    public long? CreatedBy { get; set; }

    /// <summary>ID del usuario que realizó la última modificación</summary>
    public long? UpdatedBy { get; set; }

    // ── Relaciones ───────────────────────────────────────────────
    public ICollection<NomencladorMaestroAuditLog> AuditLogs { get; set; } = new List<NomencladorMaestroAuditLog>();
}
