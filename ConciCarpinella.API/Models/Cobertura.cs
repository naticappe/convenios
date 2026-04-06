// Modelo que representa la Cobertura de una práctica dentro de un plan
// Define qué porcentaje del costo cubre la obra social para cada práctica
namespace ConciCarpinella.API.Models;

public class Cobertura
{
    public int Id { get; set; }

    // Porcentaje que cubre la obra social (ej: 80 = 80%)
    public decimal PorcentajeCubierto { get; set; }

    // Indica si esta práctica requiere autorización previa
    public bool RequiereAutorizacion { get; set; } = false;

    // Cantidad máxima de sesiones/unidades cubiertas por período
    public int? LimiteSesiones { get; set; }

    // Período del límite: "Mensual", "Anual", "Por evento"
    public string? PeriodoLimite { get; set; }

    public bool Activa { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public string? Observaciones { get; set; }

    // ── Relaciones ──────────────────────────────────────────────

    // Plan al que pertenece esta cobertura
    public int PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    // Práctica que está siendo cubierta
    public int PracticaId { get; set; }
    public Practica Practica { get; set; } = null!;
}
