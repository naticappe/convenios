// ============================================================
// SERVICIO DE TOKENS JWT
// Genera los tokens de seguridad que permiten al usuario
// mantener su sesión activa sin volver a escribir la contraseña.
// ============================================================

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ConciCarpinella.API.Models;
using Microsoft.IdentityModel.Tokens;

namespace ConciCarpinella.API.Services;

public class JwtService(IConfiguration config) : IJwtService
{
    public string GenerarToken(Usuario usuario)
    {
        var jwtConfig  = config.GetSection("Jwt");
        var secretKey  = jwtConfig["SecretKey"]!;
        var issuer     = jwtConfig["Issuer"]!;
        var audience   = jwtConfig["Audience"]!;
        var expHours   = int.Parse(jwtConfig["ExpirationHours"] ?? "8");

        // Los "claims" son datos que se incluyen dentro del token
        // El frontend los puede leer para saber quién es el usuario
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Email,          usuario.Email),
            new Claim(ClaimTypes.Name,           $"{usuario.Nombre} {usuario.Apellido}"),
            new Claim(ClaimTypes.Role,           usuario.Rol),
            new Claim("nombre",                  usuario.Nombre),
            new Claim("apellido",                usuario.Apellido),
        };

        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credenciales = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             issuer,
            audience:           audience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddHours(expHours),
            signingCredentials: credenciales
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
