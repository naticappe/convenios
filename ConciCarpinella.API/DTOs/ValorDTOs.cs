namespace ConciCarpinella.API.DTOs;

public class ValorDto
{
    public int      Id             { get; set; }
    public decimal  ValorUnitario  { get; set; }
    public DateOnly VigenciaDesde  { get; set; }
    public DateOnly? VigenciaHasta { get; set; }
    public string?  Unidad         { get; set; }
    public string?  Observaciones  { get; set; }
    public int      PlanId         { get; set; }
    public string   Plan           { get; set; } = string.Empty;
    public int      PracticaId     { get; set; }
    public string   Practica       { get; set; } = string.Empty;
    public string   CodigoPractica { get; set; } = string.Empty;
}

public class CrearEditarValorDto
{
    public decimal   ValorUnitario  { get; set; }
    public DateOnly  VigenciaDesde  { get; set; }
    public DateOnly? VigenciaHasta  { get; set; }
    public string?   Unidad         { get; set; }
    public string?   Observaciones  { get; set; }
    public int       PlanId         { get; set; }
    public int       PracticaId     { get; set; }
}
