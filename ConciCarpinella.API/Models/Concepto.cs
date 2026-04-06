// Modelo que representa un Concepto de facturación o gestión
// Los conceptos son categorías para clasificar ingresos, egresos y ajustes
namespace ConciCarpinella.API.Models;

public class Concepto
{
    public int Id { get; set; }

    // Nombre del concepto (ej: "Consulta médica", "Internación", "Honorario")
    public string Nombre { get; set; } = string.Empty;

    // Descripción detallada del concepto
    public string? Descripcion { get; set; }

    // Tipo: "Ingreso", "Egreso" o "Ajuste"
    public string Tipo { get; set; } = TipoConcepto.Ingreso;

    // Código interno para identificar el concepto
    public string? Codigo { get; set; }

    public bool Activo { get; set; } = true;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

// Constantes para los tipos de concepto
public static class TipoConcepto
{
    public const string Ingreso = "Ingreso";
    public const string Egreso  = "Egreso";
    public const string Ajuste  = "Ajuste";
}
