// ============================================================
// CONTROLADOR DE USUARIOS
// Solo accesible por administradores
// ============================================================

using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsuariosController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> ObtenerTodos()
    {
        var lista = await db.Usuarios
            .OrderBy(u => u.Apellido).ThenBy(u => u.Nombre)
            .Select(u => new UsuarioDto
            {
                Id           = u.Id,
                Nombre       = u.Nombre,
                Apellido     = u.Apellido,
                Email        = u.Email,
                Rol          = u.Rol,
                Activo       = u.Activo,
                UltimoAcceso = u.UltimoAcceso
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> ObtenerPorId(int id)
    {
        var u = await db.Usuarios.FindAsync(id);
        if (u is null) return NotFound(new { mensaje = $"No se encontró el usuario con ID {id}." });

        return Ok(new UsuarioDto
        {
            Id = u.Id, Nombre = u.Nombre, Apellido = u.Apellido,
            Email = u.Email, Rol = u.Rol, Activo = u.Activo, UltimoAcceso = u.UltimoAcceso
        });
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> Actualizar(int id, [FromBody] ActualizarUsuarioDto dto)
    {
        var u = await db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();

        u.Nombre   = dto.Nombre;
        u.Apellido = dto.Apellido;
        u.Rol      = dto.Rol;
        u.Activo   = dto.Activo;

        // Si se proporcionó una nueva contraseña, la encriptamos y guardamos
        if (!string.IsNullOrWhiteSpace(dto.NuevoPassword))
            u.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NuevoPassword);

        await db.SaveChangesAsync();

        return Ok(new UsuarioDto { Id = u.Id, Nombre = u.Nombre, Apellido = u.Apellido, Email = u.Email, Rol = u.Rol, Activo = u.Activo });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var u = await db.Usuarios.FindAsync(id);
        if (u is null) return NotFound();

        // No se puede eliminar el único administrador activo
        var adminsActivos = await db.Usuarios.CountAsync(x => x.Rol == RolUsuario.Admin && x.Activo);
        if (u.Rol == RolUsuario.Admin && adminsActivos <= 1)
            return BadRequest(new { mensaje = "No se puede eliminar el único administrador activo del sistema." });

        u.Activo = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
