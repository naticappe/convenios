// ============================================================
// MODELO: Practica
// Representa una práctica médica (prestación).
// Identidad: Codigo + NomencladorId (clave única de negocio).
// Activo es DERIVADO de VigenciaDesde / VigenciaHasta.
// La baja se implementa cerrando VigenciaHasta (no DELETE).
// ============================================================

namespace ConciCarpinella.API.Models;

public class Practica
{
    /// <summary>PK autoincremental.</summary>
    public int Id { get; set; }

    /// <summary>Código de práctica. Único dentro del nomenclador.</summary>
    public string Codigo { get; set; } = string.Empty;

    /// <summary>Nombre descriptivo de la práctica.</summary>
    public string Nombre { get; set; } = string.Empty;

    // ── FKs ───────────────────────────────────────────────────────
    /// <summary>Nomenclador (maestro) al que pertenece la práctica.</summary>
    public int NomencladorId { get; set; }
    public NomencladorMaestro NomencladorMaestro { get; set; } = null!;

    /// <summary>Clasificador asignado (opcional).</summary>
    public int? ClasificadorPracticaId { get; set; }
    public ClasificadorPractica? ClasificadorPractica { get; set; }

    // ── Vigencias ─────────────────────────────────────────────────
    /// <summary>Fecha de inicio de vigencia (UTC).</summary>
    public DateTime VigenciaDesde { get; set; }

    /// <summary>Fecha de fin de vigencia (UTC). NULL = vigente indefinidamente.</summary>
    public DateTime? VigenciaHasta { get; set; }

    /// <summary>
    /// Derivado: true si VigenciaDesde &lt;= UtcNow AND (VigenciaHasta IS NULL OR VigenciaHasta &gt; UtcNow).
    /// No se escribe directamente.
    /// </summary>
    public bool Activo { get; set; }

    // ── Auditoría ─────────────────────────────────────────────────
    public DateTime  CreatedAt  { get; set; } = DateTime.UtcNow;
    public DateTime  UpdatedAt  { get; set; } = DateTime.UtcNow;
    public long?     CreatedBy  { get; set; }
    public long?     UpdatedBy  { get; set; }

    // ── Relaciones ────────────────────────────────────────────────
    public ICollection<PracticaConceptoUnidad> ConceptoUnidades { get; set; } = new List<PracticaConceptoUnidad>();
    public ICollection<PracticaAuditLog>       AuditLogs        { get; set; } = new List<PracticaAuditLog>();

    // Relaciones con módulos existentes (no se eliminan)
    public ICollection<Valor>        Valores        { get; set; } = new List<Valor>();
    public ICollection<Cobertura>    Coberturas     { get; set; } = new List<Cobertura>();
    public ICollection<Autorizacion> Autorizaciones { get; set; } = new List<Autorizacion>();
}
