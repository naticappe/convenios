using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TraductorController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<TraductorDto>>> ObtenerTodos(
        [FromQuery] int? nomencladorOrigenId,
        [FromQuery] int? nomencladorDestinoId)
    {
        var query = db.Traductores
            .Include(t => t.NomencladorOrigen)
            .Include(t => t.NomencladorDestino)
            .AsQueryable();

        if (nomencladorOrigenId.HasValue)  query = query.Where(t => t.NomencladorOrigenId  == nomencladorOrigenId.Value);
        if (nomencladorDestinoId.HasValue) query = query.Where(t => t.NomencladorDestinoId == nomencladorDestinoId.Value);

        var lista = await query
            .OrderBy(t => t.NomencladorOrigen.Nombre).ThenBy(t => t.CodigoOrigen)
            .Select(t => new TraductorDto
            {
                Id                   = t.Id,
                CodigoOrigen         = t.CodigoOrigen,
                CodigoDestino        = t.CodigoDestino,
                Descripcion          = t.Descripcion,
                Activo               = t.Activo,
                NomencladorOrigenId  = t.NomencladorOrigenId,
                NomencladorOrigen    = t.NomencladorOrigen.Nombre,
                NomencladorDestinoId = t.NomencladorDestinoId,
                NomencladorDestino   = t.NomencladorDestino.Nombre
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TraductorDto>> ObtenerPorId(int id)
    {
        var t = await db.Traductores
            .Include(x => x.NomencladorOrigen)
            .Include(x => x.NomencladorDestino)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (t is null) return NotFound();

        return Ok(new TraductorDto
        {
            Id = t.Id, CodigoOrigen = t.CodigoOrigen, CodigoDestino = t.CodigoDestino,
            Descripcion = t.Descripcion, Activo = t.Activo,
            NomencladorOrigenId = t.NomencladorOrigenId, NomencladorOrigen = t.NomencladorOrigen.Nombre,
            NomencladorDestinoId = t.NomencladorDestinoId, NomencladorDestino = t.NomencladorDestino.Nombre
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<TraductorDto>> Crear([FromBody] CrearEditarTraductorDto dto)
    {
        var nuevo = new Traductor
        {
            CodigoOrigen         = dto.CodigoOrigen,
            CodigoDestino        = dto.CodigoDestino,
            Descripcion          = dto.Descripcion,
            Activo               = dto.Activo,
            NomencladorOrigenId  = dto.NomencladorOrigenId,
            NomencladorDestinoId = dto.NomencladorDestinoId,
            FechaCreacion        = DateTime.UtcNow
        };

        db.Traductores.Add(nuevo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, new TraductorDto { Id = nuevo.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<TraductorDto>> Actualizar(int id, [FromBody] CrearEditarTraductorDto dto)
    {
        var t = await db.Traductores.FindAsync(id);
        if (t is null) return NotFound();

        t.CodigoOrigen = dto.CodigoOrigen; t.CodigoDestino = dto.CodigoDestino;
        t.Descripcion = dto.Descripcion; t.Activo = dto.Activo;
        t.NomencladorOrigenId = dto.NomencladorOrigenId; t.NomencladorDestinoId = dto.NomencladorDestinoId;

        await db.SaveChangesAsync();
        return Ok(new TraductorDto { Id = t.Id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var t = await db.Traductores.FindAsync(id);
        if (t is null) return NotFound();
        db.Traductores.Remove(t);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
