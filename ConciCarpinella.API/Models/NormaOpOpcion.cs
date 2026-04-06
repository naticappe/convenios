namespace ConciCarpinella.API.Models;

public class NormaOpOpcion
{
    public int    Id          { get; set; }
    public string Categoria   { get; set; } = string.Empty; // e.g. "TipoOrden", "VigenciaOrden"
    public string Descripcion { get; set; } = string.Empty;
    public int    Orden       { get; set; } = 0;
}

public static class NormaOpCategoria
{
    public const string TipoOrden             = "TipoOrden";
    public const string VigenciaOrden         = "VigenciaOrden";
    public const string FechaCalculoVigencia  = "FechaCalculoVigencia";
    public const string Efector               = "Efector";          // shared: Imagen + Otras
    public const string EfectorConsultas      = "EfectorConsultas";
    public const string EfectorOftalmologia   = "EfectorOftalmologia";
    public const string EfectorNoAparece      = "EfectorNoAparece";
    public const string EstudiosValorCero     = "EstudiosValorCero";
    public const string Documentacion         = "Documentacion";
    public const string ModoCierre            = "ModoCierre";
    public const string CopiasFacturas        = "CopiasFacturas";
    public const string DireccionEntrega      = "DireccionEntrega";
    public const string ContactoFacturacion   = "ContactoFacturacion";
    public const string LaboratorioFactura    = "LaboratorioFactura";
    public const string Anestesias            = "Anestesias";
    public const string AnatomiaPatologica    = "AnatomiaPatologica";
    public const string Cirugia               = "Cirugia";
    public const string FechaFacturacion      = "FechaFacturacion";
}
