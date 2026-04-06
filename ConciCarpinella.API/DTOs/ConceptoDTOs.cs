namespace ConciCarpinella.API.DTOs;

public class ConceptoDto
{
    public int      Id            { get; set; }
    public string   Nombre        { get; set; } = string.Empty;
    public string?  Descripcion   { get; set; }
    public string   Tipo          { get; set; } = string.Empty;
    public string?  Codigo        { get; set; }
    public bool     Activo        { get; set; }
    public DateTime FechaCreacion { get; set; }
}

public class CrearEditarConceptoDto
{
    public string  Nombre      { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string  Tipo        { get; set; } = "Ingreso";
    public string? Codigo      { get; set; }
    public bool    Activo      { get; set; } = true;
}
