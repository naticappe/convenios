namespace ConciCarpinella.API.DTOs;

public class CoseguroDto
{
    public int      Id          { get; set; }
    public string   Descripcion { get; set; } = string.Empty;
    public decimal? Porcentaje  { get; set; }
    public decimal? ValorFijo   { get; set; }
    public string   Tipo        { get; set; } = string.Empty;
    public bool     Activo      { get; set; }
    public int      PlanId      { get; set; }
    public string   Plan        { get; set; } = string.Empty;
    public string   ObraSocial  { get; set; } = string.Empty;
}

public class CrearEditarCoseguroDto
{
    public string   Descripcion { get; set; } = string.Empty;
    public decimal? Porcentaje  { get; set; }
    public decimal? ValorFijo   { get; set; }
    public string   Tipo        { get; set; } = "Porcentaje";
    public bool     Activo      { get; set; } = true;
    public int      PlanId      { get; set; }
}
