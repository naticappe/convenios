// Modelo que representa un contacto asociado a una Obra Social.
// Se almacena en tabla separada para permitir múltiples contactos por obra social.
namespace ConciCarpinella.API.Models;

public class ContactoObraSocial
{
    // Identificador único
    public int Id { get; set; }

    // Nombre completo del contacto
    public string Nombre { get; set; } = string.Empty;

    // Descripción libre (cargo, área, rol, etc.)
    public string? Descripcion { get; set; }

    // Teléfono del contacto
    public string? Telefono { get; set; }

    // Correo electrónico del contacto
    public string? Mail { get; set; }

    // ── Relación con ObraSocial ──────────────────────────────────
    public int ObraSocialId { get; set; }
    public ObraSocial ObraSocial { get; set; } = null!;
}
