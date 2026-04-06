// Modelo que representa a una Obra Social en el sistema
namespace ConciCarpinella.API.Models;

public class ObraSocial
{
    // Identificador único interno (autoincrement)
    public int Id { get; set; }

    // Código numérico interno de identificación
    public int Codigo { get; set; }

    // Sigla o abreviatura de la obra social (ej: "OSDE", "SM")
    public string? Sigla { get; set; }

    // Nombre completo de la obra social
    public string Nombre { get; set; } = string.Empty;

    // CUIT de la obra social
    public string? Cuit { get; set; }

    // Fecha en que fue registrada en el sistema
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // Notas o comentarios adicionales
    public string? Observaciones { get; set; }

    // ── Relaciones ──────────────────────────────────────────────
    public ICollection<Plan>                 Planes    { get; set; } = new List<Plan>();
    public ICollection<ContactoObraSocial>   Contactos { get; set; } = new List<ContactoObraSocial>();
    public ICollection<VigenciaObraSocial>   Vigencias { get; set; } = new List<VigenciaObraSocial>();
}
