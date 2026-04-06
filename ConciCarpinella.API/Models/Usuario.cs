// Modelo que representa un Usuario del sistema
namespace ConciCarpinella.API.Models;

public class Usuario
{
    public int Id { get; set; }

    // Nombre y apellido del usuario
    public string Nombre { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;

    // Email que también funciona como nombre de usuario para el login
    public string Email { get; set; } = string.Empty;

    // Contraseña encriptada (nunca se guarda en texto plano)
    public string PasswordHash { get; set; } = string.Empty;

    // Rol del usuario en el sistema:
    // Admin      - Acceso total al sistema
    // DataEntry  - Puede cargar y editar datos
    // Analista   - Puede ver reportes y consultar datos
    // Secretario - Acceso a autorizaciones y coberturas
    public string Rol { get; set; } = RolUsuario.DataEntry;

    // Indica si el usuario puede ingresar al sistema
    public bool Activo { get; set; } = true;

    // Fecha del último ingreso al sistema
    public DateTime? UltimoAcceso { get; set; }

    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

    // Notas sobre el usuario
    public string? Observaciones { get; set; }
}

// Constantes para los roles del sistema
public static class RolUsuario
{
    public const string Admin      = "Admin";
    public const string DataEntry  = "DataEntry";
    public const string Analista   = "Analista";
    public const string Secretario = "Secretario";
}
