// Modelo que representa una Autorización médica
// Las autorizaciones son permisos que la obra social otorga para realizar prácticas
namespace ConciCarpinella.API.Models;

public class Autorizacion
{
    public int Id { get; set; }

    // Número de autorización asignado por la obra social
    public string Numero { get; set; } = string.Empty;

    // Datos del paciente
    public string NombrePaciente { get; set; } = string.Empty;
    public string ApellidoPaciente { get; set; } = string.Empty;
    public string? DniPaciente { get; set; }
    public string? NumeroAfiliado { get; set; }

    // Diagnóstico (puede ser código CIE-10 o descripción)
    public string? Diagnostico { get; set; }

    // Estado de la autorización
    // Valores posibles: Pendiente, Aprobada, Rechazada, Vencida, Utilizada
    public string Estado { get; set; } = EstadoAutorizacion.Pendiente;

    // Fecha en que se solicitó la autorización
    public DateTime FechaSolicitud { get; set; } = DateTime.UtcNow;

    // Fecha en que vence la autorización
    public DateTime? FechaVencimiento { get; set; }

    // Fecha en que fue utilizada
    public DateTime? FechaUtilizacion { get; set; }

    // Cantidad de sesiones o unidades autorizadas
    public int? CantidadAutorizada { get; set; }

    public string? Observaciones { get; set; }

    // ── Relaciones ──────────────────────────────────────────────

    // Plan bajo el cual se solicita la autorización
    public int PlanId { get; set; }
    public Plan Plan { get; set; } = null!;

    // Práctica que se solicita autorizar
    public int PracticaId { get; set; }
    public Practica Practica { get; set; } = null!;
}

// Constantes para los posibles estados de una autorización
public static class EstadoAutorizacion
{
    public const string Pendiente  = "Pendiente";
    public const string Aprobada   = "Aprobada";
    public const string Rechazada  = "Rechazada";
    public const string Vencida    = "Vencida";
    public const string Utilizada  = "Utilizada";
}
