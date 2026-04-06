// ============================================================
// CONTROLADOR DE CONTACTOS DE OBRA SOCIAL
// CRUD de contactos asociados a una obra social específica.
// Ruta base: api/obrassociales/{obraSocialId}/contactos
// ============================================================

using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Controllers;

[ApiController]
[Route("api/obrassociales/{obraSocialId:int}/contactos")]
[Authorize]
public class ContactosObraSocialController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>Lista todos los contactos de una obra social</summary>
    [HttpGet]
    public async Task<ActionResult<List<ContactoObraSocialDto>>> Listar(int obraSocialId)
    {
        var existe = await db.ObrasSociales.AnyAsync(o => o.Id == obraSocialId);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {obraSocialId}." });

        var contactos = await db.ContactosObraSocial
            .Where(c => c.ObraSocialId == obraSocialId)
            .OrderBy(c => c.Nombre)
            .Select(c => new ContactoObraSocialDto
            {
                Id           = c.Id,
                ObraSocialId = c.ObraSocialId,
                Nombre       = c.Nombre,
                Descripcion  = c.Descripcion,
                Telefono     = c.Telefono,
                Mail         = c.Mail
            })
            .ToListAsync();

        return Ok(contactos);
    }

    /// <summary>Obtiene un contacto específico por su ID</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ContactoObraSocialDto>> ObtenerPorId(int obraSocialId, int id)
    {
        var contacto = await db.ContactosObraSocial
            .FirstOrDefaultAsync(c => c.Id == id && c.ObraSocialId == obraSocialId);

        if (contacto is null)
            return NotFound(new { mensaje = $"No se encontró el contacto con ID {id}." });

        return Ok(MapearDto(contacto));
    }

    /// <summary>Crea un nuevo contacto para la obra social</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ContactoObraSocialDto>> Crear(
        int obraSocialId,
        [FromBody] CrearEditarContactoObraSocialDto dto)
    {
        var existe = await db.ObrasSociales.AnyAsync(o => o.Id == obraSocialId);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {obraSocialId}." });

        var nuevo = new ContactoObraSocial
        {
            ObraSocialId = obraSocialId,
            Nombre       = dto.Nombre,
            Descripcion  = dto.Descripcion,
            Telefono     = dto.Telefono,
            Mail         = dto.Mail
        };

        db.ContactosObraSocial.Add(nuevo);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId),
            new { obraSocialId, id = nuevo.Id },
            MapearDto(nuevo));
    }

    /// <summary>Actualiza un contacto existente</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ContactoObraSocialDto>> Actualizar(
        int obraSocialId,
        int id,
        [FromBody] CrearEditarContactoObraSocialDto dto)
    {
        var contacto = await db.ContactosObraSocial
            .FirstOrDefaultAsync(c => c.Id == id && c.ObraSocialId == obraSocialId);

        if (contacto is null)
            return NotFound(new { mensaje = $"No se encontró el contacto con ID {id}." });

        contacto.Nombre      = dto.Nombre;
        contacto.Descripcion = dto.Descripcion;
        contacto.Telefono    = dto.Telefono;
        contacto.Mail        = dto.Mail;

        await db.SaveChangesAsync();

        return Ok(MapearDto(contacto));
    }

    /// <summary>Elimina un contacto</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<IActionResult> Eliminar(int obraSocialId, int id)
    {
        var contacto = await db.ContactosObraSocial
            .FirstOrDefaultAsync(c => c.Id == id && c.ObraSocialId == obraSocialId);

        if (contacto is null)
            return NotFound(new { mensaje = $"No se encontró el contacto con ID {id}." });

        db.ContactosObraSocial.Remove(contacto);
        await db.SaveChangesAsync();

        return NoContent();
    }

    // ── Mapeador ────────────────────────────────────────────────
    private static ContactoObraSocialDto MapearDto(ContactoObraSocial c) => new()
    {
        Id           = c.Id,
        ObraSocialId = c.ObraSocialId,
        Nombre       = c.Nombre,
        Descripcion  = c.Descripcion,
        Telefono     = c.Telefono,
        Mail         = c.Mail
    };
}
