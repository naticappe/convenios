// ============================================================
// MODELO: PracticaConceptoUnidad  (tabla de detalle)
// Define la composición facturable de cada práctica.
// Vincula una Práctica con un Concepto y una UnidadArancel.
// Una práctica puede tener múltiples filas activas simultáneas.
// La baja se implementa cerrando VigenciaHasta (no DELETE físico).
// ============================================================

namespace ConciCarpinella.API.Models;

public class PracticaConceptoUnidad
{
    /// <summary>PK autoincremental del vínculo.</summary>
    public int Id { get; set; }

    // ── FKs ───────────────────────────────────────────────────────
    /// <summary>Referencia a la práctica. CASCADE DELETE.</summary>
    public int PracticaId { get; set; }
    public Practica Practica { get; set; } = null!;

    /// <summary>Referencia al concepto vinculado (ConceptoMaestro).</summary>
    public int ConceptoMaestroId { get; set; }
    public ConceptoMaestro ConceptoMaestro { get; set; } = null!;

    /// <summary>Referencia a la unidad de arancel para este vínculo.</summary>
    public int UnidadArancelId { get; set; }
    public UnidadArancel UnidadArancel { get; set; } = null!;

    // ── Valores ───────────────────────────────────────────────────
    /// <summary>Cantidad de unidades del arancel para este vínculo.</summary>
    public decimal Unidades { get; set; }

    /// <summary>Factor de cantidad adicional para la liquidación.</summary>
    public decimal Cantidad { get; set; }

    // ── Vigencias ─────────────────────────────────────────────────
    /// <summary>Fecha de inicio de vigencia del vínculo (UTC).</summary>
    public DateTime VigenciaDesde { get; set; }

    /// <summary>Fecha de fin de vigencia del vínculo. NULL = vigente indefinidamente.</summary>
    public DateTime? VigenciaHasta { get; set; }

    /// <summary>Derivado de fechas, igual que en la tabla principal.</summary>
    public bool Activo { get; set; }

    // ── Auditoría ─────────────────────────────────────────────────
    public DateTime  CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt { get; set; } = DateTime.UtcNow;
    public long?     CreatedBy { get; set; }
    public long?     UpdatedBy { get; set; }
}
