// ============================================================
// MODELO: PracticaAuditLog  (tabla de auditoría)
// Registra TODOS los cambios sobre practica y practica_concepto_unidad.
// El campo Entidad distingue qué tabla fue modificada.
// Acciones: ALTA | MODIFICACION | CAMBIO_VIGENCIA | IMPORTACION
// ============================================================

namespace ConciCarpinella.API.Models;

public class PracticaAuditLog
{
    /// <summary>PK de la auditoría.</summary>
    public long Id { get; set; }

    /// <summary>Referencia al registro principal. CASCADE DELETE.</summary>
    public int PracticaId { get; set; }
    public Practica Practica { get; set; } = null!;

    /// <summary>Referencia al vínculo detalle (null si el cambio fue solo en la práctica).</summary>
    public int? PracticaConceptoUnidadId { get; set; }

    /// <summary>Acción realizada: ALTA | MODIFICACION | CAMBIO_VIGENCIA | IMPORTACION</summary>
    public string Accion { get; set; } = string.Empty;

    /// <summary>Tabla modificada: PRACTICA | PRACTICA_CONCEPTO</summary>
    public string Entidad { get; set; } = string.Empty;

    /// <summary>Momento exacto del cambio (UTC).</summary>
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que realizó la acción.</summary>
    public long? UsuarioId { get; set; }

    /// <summary>Nombre completo del usuario (snapshot).</summary>
    public string UsuarioNombre { get; set; } = string.Empty;

    /// <summary>Origen: MANUAL | IMPORTACION | SISTEMA</summary>
    public string Origen { get; set; } = "MANUAL";

    /// <summary>Agrupa logs de una misma importación masiva.</summary>
    public Guid? TransactionId { get; set; }

    /// <summary>JSON serializado del estado anterior completo.</summary>
    public string? DatosAnteriores { get; set; }

    /// <summary>JSON serializado del estado nuevo completo.</summary>
    public string? DatosNuevos { get; set; }
}
