namespace ConciCarpinella.API.Models;

public class NormaOperativa
{
    public int    Id        { get; set; }

    // Link to ObraSocial (nullable - matched by CodigoOs when possible)
    public int?   ObraSocialId { get; set; }
    public ObraSocial? ObraSocial { get; set; }

    // Identificación (from Excel)
    public string NombreOs  { get; set; } = string.Empty;
    public int?   CodigoOs  { get; set; }
    public string? LinkDrive { get; set; }

    // === SECCIÓN: Coseguros y Autorización ===
    public string? Coseguros                      { get; set; }
    public int?    TipoOrdenId                    { get; set; }
    public NormaOpOpcion? TipoOrden               { get; set; }
    public int?    VigenciaOrdenId                { get; set; }
    public NormaOpOpcion? VigenciaOrden           { get; set; }
    public int?    FechaCalculoVigenciaId         { get; set; }
    public NormaOpOpcion? FechaCalculoVigencia    { get; set; }
    public string? AceptaPedidoDigitalPreimpreso  { get; set; }
    public bool?   AceptaPedidoFirmaDigital       { get; set; }
    public string? RequiereAutorizacionExpresa    { get; set; }
    public string? AceptaRpDigital                { get; set; }
    public string? TipoAutorizacion               { get; set; }
    public string? FormatoAutorizacion            { get; set; }
    public string? AceptaFotocopiaRp              { get; set; }
    public string? CarnetDiscapacidadOncologico   { get; set; }
    public string? PaginaObraSocial               { get; set; }
    public string? Usuario                        { get; set; }
    public string? Contrasena                     { get; set; }
    public string? LinkInstructivo                { get; set; }
    public string? FechaAutorizacion              { get; set; }
    public string? MedicoNoAparece                { get; set; }

    // === SECCIÓN: Efectores ===
    public int?    EfectorImagenId                { get; set; }
    public NormaOpOpcion? EfectorImagen           { get; set; }
    public int?    EfectorConsultasId             { get; set; }
    public NormaOpOpcion? EfectorConsultas        { get; set; }
    public int?    EfectorOftalmologiaId          { get; set; }
    public NormaOpOpcion? EfectorOftalmologia     { get; set; }
    public int?    EfectorOtrasId                 { get; set; }
    public NormaOpOpcion? EfectorOtras            { get; set; }
    public string? EfectorNoAparece               { get; set; }

    // === SECCIÓN: Prácticas Especiales ===
    public string? Anestesias                     { get; set; }
    public string? AnatomiaPatologica             { get; set; }
    public string? Cirugia                        { get; set; }
    public int?    EstudiosValorCeroId            { get; set; }
    public NormaOpOpcion? EstudiosValorCero       { get; set; }
    public string? ObservacionesAutorizaciones    { get; set; }
    public string? HorarioObraSocial              { get; set; }

    // === SECCIÓN: Facturación ===
    public int?    FechaFacturacionId             { get; set; }
    public NormaOpOpcion? FechaFacturacion        { get; set; }
    public int?    DocumentacionId                { get; set; }
    public NormaOpOpcion? Documentacion           { get; set; }
    public int?    ModoCierreId                   { get; set; }
    public NormaOpOpcion? ModoCierre              { get; set; }
    public int?    CopiasFacturasId               { get; set; }
    public NormaOpOpcion? CopiasFacturas          { get; set; }
    public int?    DireccionEntregaId             { get; set; }
    public NormaOpOpcion? DireccionEntrega        { get; set; }
    public int?    ContactoFacturacionId          { get; set; }
    public NormaOpOpcion? ContactoFacturacion     { get; set; }
    public bool?   SoporteMagnetico               { get; set; }
    public bool?   LibreDeDeuda                   { get; set; }
    public bool?   TroquelContrastes              { get; set; }
    public int?    LaboratorioFacturaId           { get; set; }
    public NormaOpOpcion? LaboratorioFactura      { get; set; }

    // === SECCIÓN: Información Adicional ===
    public string? InformacionAdicional           { get; set; }

    // Auditoría
    public DateTime  FechaCreacion          { get; set; } = DateTime.UtcNow;
    public DateTime? FechaUltimaModificacion { get; set; }
    public string?   CreadoPor              { get; set; }
    public string?   ModificadoPor          { get; set; }
}
