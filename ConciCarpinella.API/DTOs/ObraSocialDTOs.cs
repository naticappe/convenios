using ConciCarpinella.API.Models;

namespace ConciCarpinella.API.DTOs;

// ── Lista resumida de obras sociales ─────────────────────────
public class ObraSocialListDto
{
    public int     Id             { get; set; }
    public int     Codigo         { get; set; }
    public string? Sigla          { get; set; }
    public string  Nombre         { get; set; } = string.Empty;
    public string? Cuit           { get; set; }
    public int     CantidadPlanes { get; set; }
    // Estado actual derivado de la última vigencia
    public string  Estado         { get; set; } = "Activa";
}

// ── Detalle completo de una obra social ──────────────────────
public class ObraSocialDto
{
    public int      Id            { get; set; }
    public int      Codigo        { get; set; }
    public string?  Sigla         { get; set; }
    public string   Nombre        { get; set; } = string.Empty;
    public string?  Cuit          { get; set; }
    public string?  Observaciones { get; set; }
    public DateTime FechaCreacion { get; set; }
    public string   Estado        { get; set; } = "Activa";
    public List<PlanListDto> Planes { get; set; } = new();
}

// ── Para crear o editar una obra social ──────────────────────
public class CrearEditarObraSocialDto
{
    public int     Codigo        { get; set; }
    public string? Sigla         { get; set; }
    public string  Nombre        { get; set; } = string.Empty;
    public string? Cuit          { get; set; }
    public string? Observaciones { get; set; }
}

// ── Contacto de obra social ──────────────────────────────────
public class ContactoObraSocialDto
{
    public int     Id           { get; set; }
    public int     ObraSocialId { get; set; }
    public string  Nombre       { get; set; } = string.Empty;
    public string? Descripcion  { get; set; }
    public string? Telefono     { get; set; }
    public string? Mail         { get; set; }
}

public class CrearEditarContactoObraSocialDto
{
    public string  Nombre      { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public string? Telefono    { get; set; }
    public string? Mail        { get; set; }
}

// ── Vigencia de obra social ───────────────────────────────────
public class VigenciaObraSocialDto
{
    public int       Id           { get; set; }
    public int       ObraSocialId { get; set; }
    public string    Estado       { get; set; } = string.Empty;
    public DateTime  FechaDesde   { get; set; }
    public DateTime? FechaHasta   { get; set; }
    public string?   Observaciones { get; set; }
}

public class CrearVigenciaObraSocialDto
{
    public string    Estado        { get; set; } = string.Empty;
    public DateTime  FechaDesde    { get; set; }
    public string?   Observaciones { get; set; }
}
