// ============================================================
// CONTROLADOR DE AUTENTICACIÓN
// Maneja el login y el registro de usuarios
// ============================================================

using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConciCarpinella.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService authService) : ControllerBase
{
    /// <summary>
    /// Inicia sesión con email y contraseña.
    /// Devuelve un token JWT para usar en las siguientes peticiones.
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var resultado = await authService.LoginAsync(request);

        if (resultado is null)
            return Unauthorized(new { mensaje = "Email o contraseña incorrectos." });

        return Ok(resultado);
    }

    /// <summary>
    /// Registra un nuevo usuario. Solo pueden hacerlo los administradores.
    /// </summary>
    [HttpPost("registrar")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UsuarioDto>> Registrar([FromBody] CrearUsuarioDto request)
    {
        var usuario = await authService.RegistrarUsuarioAsync(request);
        return CreatedAtAction(nameof(Login), usuario);
    }
}
