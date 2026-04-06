// ============================================================
// SERVICIO DE AUTENTICACIÓN
// Maneja el login y registro de usuarios en el sistema
// ============================================================

using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Services;

public class AuthService(ApplicationDbContext db, IJwtService jwtService) : IAuthService
{
    public async Task<LoginResponseDto?> LoginAsync(LoginRequestDto request)
    {
        // Buscar el usuario por email (ignorando mayúsculas/minúsculas)
        var usuario = await db.Usuarios
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Activo);

        if (usuario is null)
            return null;

        // Verificar que la contraseña ingresada coincida con la almacenada (encriptada)
        if (!BCrypt.Net.BCrypt.Verify(request.Password, usuario.PasswordHash))
            return null;

        // Actualizar la fecha del último acceso
        usuario.UltimoAcceso = DateTime.UtcNow;
        await db.SaveChangesAsync();

        // Generar el token JWT para la sesión
        var token = jwtService.GenerarToken(usuario);

        return new LoginResponseDto
        {
            Token    = token,
            Usuario  = MapearUsuarioDto(usuario)
        };
    }

    public async Task<UsuarioDto> RegistrarUsuarioAsync(CrearUsuarioDto request)
    {
        // Verificar que el email no esté ya registrado
        if (await db.Usuarios.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower()))
            throw new InvalidOperationException($"Ya existe un usuario con el email '{request.Email}'.");

        var usuario = new Usuario
        {
            Nombre       = request.Nombre,
            Apellido     = request.Apellido,
            Email        = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Rol          = request.Rol,
            Activo       = true,
            FechaCreacion = DateTime.UtcNow
        };

        db.Usuarios.Add(usuario);
        await db.SaveChangesAsync();

        return MapearUsuarioDto(usuario);
    }

    // Convierte un modelo Usuario en un DTO (objeto de transferencia sin datos sensibles)
    private static UsuarioDto MapearUsuarioDto(Usuario u) => new()
    {
        Id           = u.Id,
        Nombre       = u.Nombre,
        Apellido     = u.Apellido,
        Email        = u.Email,
        Rol          = u.Rol,
        Activo       = u.Activo,
        UltimoAcceso = u.UltimoAcceso
    };
}
