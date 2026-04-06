namespace ConciCarpinella.API.DTOs;

public class CoberturaDto
{
    public int      Id                   { get; set; }
    public decimal  PorcentajeCubierto   { get; set; }
    public bool     RequiereAutorizacion { get; set; }
    public int?     LimiteSesiones       { get; set; }
    public string?  PeriodoLimite        { get; set; }
    public bool     Activa               { get; set; }
    public string?  Observaciones        { get; set; }
    public int      PlanId               { get; set; }
    public string   Plan                 { get; set; } = string.Empty;
    public string   ObraSocial           { get; set; } = string.Empty;
    public int      PracticaId           { get; set; }
    public string   Practica             { get; set; } = string.Empty;
    public string   CodigoPractica       { get; set; } = string.Empty;
}

public class CrearEditarCoberturaDto
{
    public decimal  PorcentajeCubierto   { get; set; }
    public bool     RequiereAutorizacion { get; set; } = false;
    public int?     LimiteSesiones       { get; set; }
    public string?  PeriodoLimite        { get; set; }
    public bool     Activa               { get; set; } = true;
    public string?  Observaciones        { get; set; }
    public int      PlanId               { get; set; }
    public int      PracticaId           { get; set; }
}
