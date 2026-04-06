// Modelo que representa el valor económico de una práctica dentro de un plan
namespace ConciCarpinella.API.Models;

public class Valor
{
    public int Id { get; set; }

    // Monto económico de la práctica (en la moneda configurada)
    public decimal ValorUnitario { get; set; }

    // Desde cuándo rige este valor
    public DateOnly VigenciaDesde { get; set; }

    // Hasta cuándo rige este valor (nulo = sin fecha de vencimiento)
    public DateOnly? VigenciaHasta { get; set; }

    // Unidad de medida o módulo (puede ser "consulta", "sesión", "unidad", etc.)
    public string? Unidad { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    public string? Observaciones { get; set; }

    // ── Relaciones ──────────────────────────────────────────────

    // Plan al que pertenece este valor
    public int PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    // Práctica a la que corresponde este valor
    public int PracticaId { get; set; }
    public Practica Practica { get; set; } = null!;
}
