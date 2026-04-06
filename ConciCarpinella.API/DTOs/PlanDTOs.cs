namespace ConciCarpinella.API.DTOs;

// ── Lista resumida (tabla) ────────────────────────────────────
public class PlanListDto
{
    public int     Id             { get; set; }
    public string  Nombre         { get; set; } = string.Empty;
    public string? Alias          { get; set; }
    public string  TipoIva        { get; set; } = "Exento";
    public string  ObraSocial     { get; set; } = string.Empty;
    public int     ObraSocialId   { get; set; }
    public string  Estado         { get; set; } = "Activo";
    public bool    EsAutogestion  { get; set; }
}

// ── Detalle completo (para el formulario de edición) ──────────
public class PlanDetalleDto
{
    public int      Id             { get; set; }
    public string   Nombre         { get; set; } = string.Empty;
    public string?  Alias          { get; set; }
    public string?  Descripcion    { get; set; }
    public string   TipoIva        { get; set; } = "Exento";
    public int      ObraSocialId   { get; set; }
    public string   ObraSocial     { get; set; } = string.Empty;
    public DateTime FechaCreacion  { get; set; }
    public string   Estado         { get; set; } = "Activo";
    public bool     EsAutogestion  { get; set; }
}

// ── Para crear o editar un plan ───────────────────────────────
public class CrearEditarPlanDto
{
    public string    Nombre        { get; set; } = string.Empty;
    public string?   Alias         { get; set; }
    public string?   Descripcion   { get; set; }
    public string    TipoIva       { get; set; } = "Exento";
    public int       ObraSocialId  { get; set; }
    public bool      EsAutogestion { get; set; } = false;
    /// <summary>Solo se usa al crear: fecha de inicio de la primera vigencia</summary>
    public DateTime  FechaDesde    { get; set; } = DateTime.UtcNow;
    /// <summary>Opcional: fecha de fin de la primera vigencia</summary>
    public DateTime? FechaHasta    { get; set; }
}

// ── Vigencias ─────────────────────────────────────────────────
public class VigenciaPlanDto
{
    public int       Id            { get; set; }
    public int       PlanId        { get; set; }
    public string    Estado        { get; set; } = "Activo";
    public DateTime  FechaDesde    { get; set; }
    public DateTime? FechaHasta    { get; set; }
    public string?   Observaciones { get; set; }
}

public class CrearVigenciaPlanDto
{
    public string    Estado        { get; set; } = "Activo";
    public DateTime  FechaDesde    { get; set; }
    public string?   Observaciones { get; set; }
}
