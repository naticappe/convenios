// Historial de estados de una Obra Social.
// Cada registro representa un período en que la obra social tuvo un estado determinado.
namespace ConciCarpinella.API.Models;

public class VigenciaObraSocial
{
    public int Id { get; set; }

    // Estado durante este período
    public EstadoObraSocial Estado { get; set; }

    // Inicio del período
    public DateTime FechaDesde { get; set; }

    // Fin del período (null = vigente actualmente)
    public DateTime? FechaHasta { get; set; }

    // Motivo u observación del cambio de estado
    public string? Observaciones { get; set; }

    // ── Relación ────────────────────────────────────────────────
    public int         ObraSocialId { get; set; }
    public ObraSocial  ObraSocial   { get; set; } = null!;
}
