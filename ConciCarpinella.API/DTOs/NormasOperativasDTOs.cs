namespace ConciCarpinella.API.DTOs;

/// <summary>
/// DTO para opciones de lookup (usadas en dropdowns)
/// </summary>
public class NormaOpOpcionDto
{
    public int Id { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public string Categoria { get; set; } = string.Empty;
    public int Orden { get; set; }
}

/// <summary>
/// DTO de respuesta para NormaOperativa con todas las propiedades de navegación resueltas
/// </summary>
public class NormaOperativaDto
{
    public int Id { get; set; }

    // Link to ObraSocial
    public int? ObraSocialId { get; set; }
    public string? ObraSocialNombre { get; set; }

    // Identificación
    public string NombreOs { get; set; } = string.Empty;
    public int? CodigoOs { get; set; }
    public string? LinkDrive { get; set; }

    // === SECCIÓN: Coseguros y Autorización ===
    public string? Coseguros { get; set; }
    public NormaOpOpcionDto? TipoOrden { get; set; }
    public NormaOpOpcionDto? VigenciaOrden { get; set; }
    public NormaOpOpcionDto? FechaCalculoVigencia { get; set; }
    public string? AceptaPedidoDigitalPreimpreso { get; set; }
    public bool? AceptaPedidoFirmaDigital { get; set; }
    public string? RequiereAutorizacionExpresa { get; set; }
    public string? AceptaRpDigital { get; set; }
    public string? TipoAutorizacion { get; set; }
    public string? FormatoAutorizacion { get; set; }
    public string? AceptaFotocopiaRp { get; set; }
    public string? CarnetDiscapacidadOncologico { get; set; }
    public string? PaginaObraSocial { get; set; }
    public string? Usuario { get; set; }
    public string? Contrasena { get; set; }
    public string? LinkInstructivo { get; set; }
    public string? FechaAutorizacion { get; set; }
    public string? MedicoNoAparece { get; set; }

    // === SECCIÓN: Efectores ===
    public NormaOpOpcionDto? EfectorImagen { get; set; }
    public NormaOpOpcionDto? EfectorConsultas { get; set; }
    public NormaOpOpcionDto? EfectorOftalmologia { get; set; }
    public NormaOpOpcionDto? EfectorOtras { get; set; }
    public string? EfectorNoAparece { get; set; }

    // === SECCIÓN: Prácticas Especiales ===
    public string? Anestesias { get; set; }
    public string? AnatomiaPatologica { get; set; }
    public string? Cirugia { get; set; }
    public NormaOpOpcionDto? EstudiosValorCero { get; set; }
    public string? ObservacionesAutorizaciones { get; set; }
    public string? HorarioObraSocial { get; set; }

    // === SECCIÓN: Facturación ===
    public NormaOpOpcionDto? FechaFacturacion { get; set; }
    public NormaOpOpcionDto? Documentacion { get; set; }
    public NormaOpOpcionDto? ModoCierre { get; set; }
    public NormaOpOpcionDto? CopiasFacturas { get; set; }
    public NormaOpOpcionDto? DireccionEntrega { get; set; }
    public NormaOpOpcionDto? ContactoFacturacion { get; set; }
    public bool? SoporteMagnetico { get; set; }
    public bool? LibreDeDeuda { get; set; }
    public bool? TroquelContrastes { get; set; }
    public NormaOpOpcionDto? LaboratorioFactura { get; set; }

    // === SECCIÓN: Información Adicional ===
    public string? InformacionAdicional { get; set; }

    // Auditoría
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaUltimaModificacion { get; set; }
    public string? CreadoPor { get; set; }
    public string? ModificadoPor { get; set; }
}

/// <summary>
/// DTO para crear o actualizar una NormaOperativa
/// </summary>
public class UpsertNormaOperativaDto
{
    public int? ObraSocialId { get; set; }

    // Identificación
    public string NombreOs { get; set; } = string.Empty;
    public int? CodigoOs { get; set; }
    public string? LinkDrive { get; set; }

    // === SECCIÓN: Coseguros y Autorización ===
    public string? Coseguros { get; set; }
    public int? TipoOrdenId { get; set; }
    public int? VigenciaOrdenId { get; set; }
    public int? FechaCalculoVigenciaId { get; set; }
    public string? AceptaPedidoDigitalPreimpreso { get; set; }
    public bool? AceptaPedidoFirmaDigital { get; set; }
    public string? RequiereAutorizacionExpresa { get; set; }
    public string? AceptaRpDigital { get; set; }
    public string? TipoAutorizacion { get; set; }
    public string? FormatoAutorizacion { get; set; }
    public string? AceptaFotocopiaRp { get; set; }
    public string? CarnetDiscapacidadOncologico { get; set; }
    public string? PaginaObraSocial { get; set; }
    public string? Usuario { get; set; }
    public string? Contrasena { get; set; }
    public string? LinkInstructivo { get; set; }
    public string? FechaAutorizacion { get; set; }
    public string? MedicoNoAparece { get; set; }

    // === SECCIÓN: Efectores ===
    public int? EfectorImagenId { get; set; }
    public int? EfectorConsultasId { get; set; }
    public int? EfectorOftalmologiaId { get; set; }
    public int? EfectorOtrasId { get; set; }
    public string? EfectorNoAparece { get; set; }

    // === SECCIÓN: Prácticas Especiales ===
    public string? Anestesias { get; set; }
    public string? AnatomiaPatologica { get; set; }
    public string? Cirugia { get; set; }
    public int? EstudiosValorCeroId { get; set; }
    public string? ObservacionesAutorizaciones { get; set; }
    public string? HorarioObraSocial { get; set; }

    // === SECCIÓN: Facturación ===
    public int? FechaFacturacionId { get; set; }
    public int? DocumentacionId { get; set; }
    public int? ModoCierreId { get; set; }
    public int? CopiasFacturasId { get; set; }
    public int? DireccionEntregaId { get; set; }
    public int? ContactoFacturacionId { get; set; }
    public bool? SoporteMagnetico { get; set; }
    public bool? LibreDeDeuda { get; set; }
    public bool? TroquelContrastes { get; set; }
    public int? LaboratorioFacturaId { get; set; }

    // === SECCIÓN: Información Adicional ===
    public string? InformacionAdicional { get; set; }
}

/// <summary>
/// DTO para el log de auditoría de cambios en normas operativas
/// </summary>
public class NormaOpAuditLogDto
{
    public int Id { get; set; }
    public int NormaId { get; set; }
    public string Campo { get; set; } = string.Empty;
    public string Seccion { get; set; } = string.Empty;
    public string? ValorAnterior { get; set; }
    public string? ValorNuevo { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public DateTime FechaHora { get; set; }
}
