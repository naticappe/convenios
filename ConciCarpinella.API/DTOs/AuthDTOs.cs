// ============================================================
// DTOs de AUTENTICACIÓN
// DTO = Data Transfer Object: son objetos simples que definen
// qué datos se envían/reciben en cada petición al servidor.
// ============================================================

namespace ConciCarpinella.API.DTOs;

// ── Lo que el usuario envía al hacer login ────────────────────
public class LoginRequestDto
{
    public string Email    { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

// ── Lo que el servidor devuelve después del login ─────────────
public class LoginResponseDto
{
    // Token JWT para usarlo en futuras peticiones
    public string     Token   { get; set; } = string.Empty;

    // Datos del usuario que inició sesión
    public UsuarioDto Usuario { get; set; } = null!;
}

// ── Datos de un usuario (sin la contraseña) ───────────────────
public class UsuarioDto
{
    public int       Id           { get; set; }
    public string    Nombre       { get; set; } = string.Empty;
    public string    Apellido     { get; set; } = string.Empty;
    public string    Email        { get; set; } = string.Empty;
    public string    Rol          { get; set; } = string.Empty;
    public bool      Activo       { get; set; }
    public DateTime? UltimoAcceso { get; set; }
}

// ── Para crear un nuevo usuario ───────────────────────────────
public class CrearUsuarioDto
{
    public string Nombre   { get; set; } = string.Empty;
    public string Apellido { get; set; } = string.Empty;
    public string Email    { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Rol      { get; set; } = "DataEntry";
}

// ── Para actualizar un usuario existente ─────────────────────
public class ActualizarUsuarioDto
{
    public string  Nombre       { get; set; } = string.Empty;
    public string  Apellido     { get; set; } = string.Empty;
    public string  Rol          { get; set; } = string.Empty;
    public bool    Activo       { get; set; }
    public string? NuevoPassword { get; set; }
}
