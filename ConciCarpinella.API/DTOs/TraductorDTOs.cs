namespace ConciCarpinella.API.DTOs;

public class TraductorDto
{
    public int     Id                  { get; set; }
    public string  CodigoOrigen        { get; set; } = string.Empty;
    public string  CodigoDestino       { get; set; } = string.Empty;
    public string? Descripcion         { get; set; }
    public bool    Activo              { get; set; }
    public int     NomencladorOrigenId  { get; set; }
    public string  NomencladorOrigen   { get; set; } = string.Empty;
    public int     NomencladorDestinoId { get; set; }
    public string  NomencladorDestino  { get; set; } = string.Empty;
}

public class CrearEditarTraductorDto
{
    public string  CodigoOrigen         { get; set; } = string.Empty;
    public string  CodigoDestino        { get; set; } = string.Empty;
    public string? Descripcion          { get; set; }
    public bool    Activo               { get; set; } = true;
    public int     NomencladorOrigenId  { get; set; }
    public int     NomencladorDestinoId { get; set; }
}
