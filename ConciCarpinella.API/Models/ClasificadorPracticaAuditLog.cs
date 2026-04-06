// ============================================================
// MODELO: ClasificadorPracticaAuditLog
// Registro completo de auditoría para el módulo ClasificadorPractica.
// Acciones posibles: ALTA, MODIFICACION, CAMBIO_ESTADO, IMPORTACION.
// ============================================================

namespace ConciCarpinella.API.Models;

public class ClasificadorPracticaAuditLog
{
    /// <summary>PK autoincremental (BIGSERIAL)</summary>
    public long Id { get; set; }

    /// <summary>FK a la clasificador de práctica afectada</summary>
    public int ClasificadorPracticaId { get; set; }

    /// <summary>
    /// Tipo de operación: ALTA | MODIFICACION | CAMBIO_ESTADO | IMPORTACION
    /// </summary>
    public string Accion { get; set; } = string.Empty;

    /// <summary>Fecha y hora del evento (UTC)</summary>
    public DateTime FechaEvento { get; set; } = DateTime.UtcNow;

    /// <summary>ID del usuario que realizó la operación</summary>
    public long? UsuarioId { get; set; }

    /// <summary>Nombre completo del usuario (snapshot para trazabilidad)</summary>
    public string UsuarioNombre { get; set; } = string.Empty;

    /// <summary>Origen de la operación: MANUAL | IMPORTACION | SISTEMA</summary>
    public string Origen { get; set; } = "MANUAL";

    /// <summary>UUID que agrupa todos los logs de una misma importación masiva</summary>
    public Guid? TransactionId { get; set; }

    // ── Valores anteriores ───────────────────────────────────────
    public string? Nivel1Anterior { get; set; }
    public string? Nivel2Anterior { get; set; }
    public string? Nivel3Anterior { get; set; }
    public bool?   ActivoAnterior { get; set; }

    // ── Valores nuevos ───────────────────────────────────────────
    public string? Nivel1Nuevo { get; set; }
    public string? Nivel2Nuevo { get; set; }
    public string? Nivel3Nuevo { get; set; }
    public bool?   ActivoNuevo { get; set; }

    /// <summary>Snapshot JSON del estado anterior completo</summary>
    public string? DatosAnteriores { get; set; }

    /// <summary>Snapshot JSON del estado nuevo completo</summary>
    public string? DatosNuevos { get; set; }

    // ── Relaciones ───────────────────────────────────────────────
    public ClasificadorPractica ClasificadorPractica { get; set; } = null!;
}
