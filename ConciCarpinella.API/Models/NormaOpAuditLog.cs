namespace ConciCarpinella.API.Models;

public class NormaOpAuditLog
{
    public int      Id             { get; set; }
    public int      NormaId        { get; set; }
    public string   Campo          { get; set; } = string.Empty;
    public string   Seccion        { get; set; } = string.Empty; // "Identificación", "Autorización", etc.
    public string?  ValorAnterior  { get; set; }
    public string?  ValorNuevo     { get; set; }
    public string   UsuarioNombre  { get; set; } = string.Empty;
    public DateTime FechaHora      { get; set; } = DateTime.UtcNow;
}
