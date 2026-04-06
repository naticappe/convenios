namespace ConciCarpinella.API.DTOs;

public class AutorizacionListDto
{
    public int      Id               { get; set; }
    public string   Numero           { get; set; } = string.Empty;
    public string   Paciente         { get; set; } = string.Empty;
    public string   Practica         { get; set; } = string.Empty;
    public string   Plan             { get; set; } = string.Empty;
    public string   ObraSocial       { get; set; } = string.Empty;
    public string   Estado           { get; set; } = string.Empty;
    public DateTime FechaSolicitud   { get; set; }
    public DateTime? FechaVencimiento { get; set; }
}

public class AutorizacionDto
{
    public int       Id                  { get; set; }
    public string    Numero              { get; set; } = string.Empty;
    public string    NombrePaciente      { get; set; } = string.Empty;
    public string    ApellidoPaciente    { get; set; } = string.Empty;
    public string?   DniPaciente         { get; set; }
    public string?   NumeroAfiliado      { get; set; }
    public string?   Diagnostico         { get; set; }
    public string    Estado              { get; set; } = string.Empty;
    public DateTime  FechaSolicitud      { get; set; }
    public DateTime? FechaVencimiento    { get; set; }
    public DateTime? FechaUtilizacion    { get; set; }
    public int?      CantidadAutorizada  { get; set; }
    public string?   Observaciones       { get; set; }
    public int       PlanId              { get; set; }
    public string    Plan                { get; set; } = string.Empty;
    public string    ObraSocial          { get; set; } = string.Empty;
    public int       PracticaId          { get; set; }
    public string    Practica            { get; set; } = string.Empty;
    public string    CodigoPractica      { get; set; } = string.Empty;
}

public class CrearEditarAutorizacionDto
{
    public string    Numero             { get; set; } = string.Empty;
    public string    NombrePaciente     { get; set; } = string.Empty;
    public string    ApellidoPaciente   { get; set; } = string.Empty;
    public string?   DniPaciente        { get; set; }
    public string?   NumeroAfiliado     { get; set; }
    public string?   Diagnostico        { get; set; }
    public string    Estado             { get; set; } = "Pendiente";
    public DateTime? FechaVencimiento   { get; set; }
    public int?      CantidadAutorizada { get; set; }
    public string?   Observaciones      { get; set; }
    public int       PlanId             { get; set; }
    public int       PracticaId         { get; set; }
}
