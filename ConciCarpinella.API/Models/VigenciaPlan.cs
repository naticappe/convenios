namespace ConciCarpinella.API.Models;

public class VigenciaPlan
{
    public int Id { get; set; }

    /// <summary>Estado del plan en este período</summary>
    public EstadoPlan Estado { get; set; }

    public DateTime  FechaDesde    { get; set; }
    public DateTime? FechaHasta    { get; set; }
    public string?   Observaciones { get; set; }

    // Relación con Plan
    public int  PlanId { get; set; }
    public Plan Plan   { get; set; } = null!;
}
