// Modelo que representa una traducción entre nomencladores
// Permite mapear el código de una práctica de un nomenclador a otro
// Ejemplo: código "05.01" en nomenclador A equivale a "MED001" en nomenclador B
namespace ConciCarpinella.API.Models;

public class Traductor
{
    public int Id { get; set; }

    // Código en el nomenclador de origen
    public string CodigoOrigen { get; set; } = string.Empty;

    // Código equivalente en el nomenclador de destino
    public string CodigoDestino { get; set; } = string.Empty;

    // Descripción o aclaración de esta equivalencia
    public string? Descripcion { get; set; }

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // ── Relaciones ──────────────────────────────────────────────

    // Nomenclador desde el que se traduce
    public int NomencladorOrigenId { get; set; }
    public NomencladorMaestro NomencladorOrigen { get; set; } = null!;

    // Nomenclador al que se traduce
    public int NomencladorDestinoId { get; set; }
    public NomencladorMaestro NomencladorDestino { get; set; } = null!;
}
