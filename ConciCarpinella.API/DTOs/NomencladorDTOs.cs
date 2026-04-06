namespace ConciCarpinella.API.DTOs;

public class NomencladorDto
{
    public int      Id            { get; set; }
    public string   Nombre        { get; set; } = string.Empty;
    public string?  Version       { get; set; }
    public string?  Descripcion   { get; set; }
    public bool     Activo        { get; set; }
    public DateTime FechaCreacion { get; set; }
    public int      CantidadPracticas { get; set; }
}

public class CrearEditarNomencladorDto
{
    public string  Nombre      { get; set; } = string.Empty;
    public string? Version     { get; set; }
    public string? Descripcion { get; set; }
    public bool    Activo      { get; set; } = true;
}
