// Interfaz del servicio JWT
// Define qué operaciones puede realizar el servicio de tokens
using ConciCarpinella.API.Models;

namespace ConciCarpinella.API.Services;

public interface IJwtService
{
    /// <summary>
    /// Genera un token JWT para el usuario autenticado
    /// </summary>
    string GenerarToken(Usuario usuario);
}
