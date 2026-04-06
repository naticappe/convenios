// Modelo que representa un Coseguro dentro de un Plan
// El coseguro es la parte que paga el paciente (no cubre la obra social)
namespace ConciCarpinella.API.Models;

public class Coseguro
{
    public int Id { get; set; }

    // Nombre o descripción del coseguro (ej: "Coseguro consulta general")
    public string Descripcion { get; set; } = string.Empty;

    // Porcentaje que paga el paciente (ej: 20 = 20%)
    // Si es nulo, se usa el ValorFijo
    public decimal? Porcentaje { get; set; }

    // Monto fijo que paga el paciente (alternativa al porcentaje)
    public decimal? ValorFijo { get; set; }

    // Tipo de coseguro: "Porcentaje" o "ValorFijo"
    public string Tipo { get; set; } = "Porcentaje";

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // ── Relaciones ──────────────────────────────────────────────

    // Plan al que pertenece este coseguro
    public int PlanId { get; set; }
    public Plan Plan { get; set; } = null!;
}
