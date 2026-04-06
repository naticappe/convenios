using ConciCarpinella.API.DTOs;

namespace ConciCarpinella.API.Services;

public interface IAuthService
{
    /// <summary>Verifica credenciales y retorna el token JWT si son correctas</summary>
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);

    /// <summary>Registra un nuevo usuario en el sistema</summary>
    Task<UsuarioDto> RegistrarUsuarioAsync(CrearUsuarioDto request);
}
