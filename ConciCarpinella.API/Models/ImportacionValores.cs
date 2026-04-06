// Representa una importación de valores desde un archivo Excel del proveedor.
// Cada importación tiene un listado de prácticas con sus valores nuevos.
// Se guarda como "borrador" al parsear, y se marca Aplicada = true al confirmar.
namespace ConciCarpinella.API.Models;

public class ImportacionValores
{
    public int Id { get; set; }

    // Obra social a la que pertenece esta importación
    public int ObraSocialId { get; set; }
    public ObraSocial ObraSocial { get; set; } = null!;

    // Nombre del archivo Excel subido
    public string NombreArchivo { get; set; } = string.Empty;

    // Desde qué fecha rigen estos valores
    public DateOnly VigenciaDesde { get; set; }

    // Cuándo se procesó el archivo
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // true = ya se aplicaron los valores a los planes seleccionados
    public bool Aplicada { get; set; } = false;

    public string? Observaciones { get; set; }

    // Prácticas y valores que vinieron en el archivo
    public ICollection<ImportacionValoresItem> Items { get; set; } = new List<ImportacionValoresItem>();
}
