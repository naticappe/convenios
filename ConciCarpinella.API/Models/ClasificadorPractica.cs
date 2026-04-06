// ============================================================
// MODELO: ClasificadorPractica
// Gestiona los criterios de clasificación de prácticas médicas
// organizados en 3 niveles jerárquicos (árbol).
// La clave única de negocio es la combinación Nivel1+Nivel2+Nivel3.
// Activo es un booleano simple (sin fechas de vigencia).
// ============================================================

namespace ConciCarpinella.API.Models;

public class ClasificadorPractica
{
    /// <summary>Identificador único (PK autoincrement)</summary>
    public int Id { get; set; }

    /// <summary>Clasificación de primer nivel. Parte de la clave única compuesta.</summary>
    public string Nivel1 { get; set; } = string.Empty;

    /// <summary>Clasificación de segundo nivel. Parte de la clave única compuesta.</summary>
    public string Nivel2 { get; set; } = string.Empty;

    /// <summary>Clasificación de tercer nivel. Parte de la clave única compuesta.</summary>
    public string Nivel3 { get; set; } = string.Empty;

    /// <summary>Estado del clasificador. Valor directo (no derivado). Default = true al crear.</summary>
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
    public ICollection<ClasificadorPracticaAuditLog> AuditLogs { get; set; } = new List<ClasificadorPracticaAuditLog>();
}
