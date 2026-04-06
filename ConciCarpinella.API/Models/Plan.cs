// Modelo que representa un Plan de una Obra Social
namespace ConciCarpinella.API.Models;

public class Plan
{
    public int Id { get; set; }

    /// <summary>Nombre para facturación</summary>
    public string Nombre { get; set; } = string.Empty;

    /// <summary>Nombre visible para el paciente</summary>
    public string? Alias { get; set; }

    /// <summary>Descripción detallada del plan</summary>
    public string? Descripcion { get; set; }

    /// <summary>Tipo de IVA aplicado al plan</summary>
    public TipoIva TipoIva { get; set; } = TipoIva.Exento;

    /// <summary>Indica si este plan se trata como Obra Social en los módulos de autogestión</summary>
    public bool EsAutogestion { get; set; } = false;

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // ── Relaciones ──────────────────────────────────────────────

    public int        ObraSocialId { get; set; }
    public ObraSocial ObraSocial   { get; set; } = null!;

    public ICollection<Valor>       Valores        { get; set; } = new List<Valor>();
    public ICollection<Coseguro>    Coseguros      { get; set; } = new List<Coseguro>();
    public ICollection<Cobertura>   Coberturas     { get; set; } = new List<Cobertura>();
    public ICollection<Autorizacion> Autorizaciones { get; set; } = new List<Autorizacion>();
    public ICollection<VigenciaPlan> Vigencias      { get; set; } = new List<VigenciaPlan>();
}
