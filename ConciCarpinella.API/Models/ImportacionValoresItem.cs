// Una fila del archivo Excel importado: código de práctica + valor económico
namespace ConciCarpinella.API.Models;

public class ImportacionValoresItem
{
    public int Id { get; set; }

    public int ImportacionId { get; set; }
    public ImportacionValores Importacion { get; set; } = null!;

    // Código interno de la práctica (columna CÓDIGO del archivo)
    public string CodigoPractica { get; set; } = string.Empty;

    // Código externo del proveedor (ej: Cód. Avalian)
    public string CodigoExterno { get; set; } = string.Empty;

    // Descripción de la práctica tal como viene en el archivo
    public string DescripcionPractica { get; set; } = string.Empty;

    // Valor económico importado (sin ajuste por plan)
    public decimal ValorImportado { get; set; }

    public string? Observaciones { get; set; }
}
