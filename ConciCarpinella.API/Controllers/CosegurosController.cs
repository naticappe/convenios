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
public class CosegurosController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CoseguroDto>>> ObtenerTodos([FromQuery] int? planId)
    {
        var query = db.Coseguros.Include(c => c.Plan).ThenInclude(p => p.ObraSocial).AsQueryable();
        if (planId.HasValue) query = query.Where(c => c.PlanId == planId.Value);

        var lista = await query
            .OrderBy(c => c.Plan.ObraSocial.Nombre).ThenBy(c => c.Descripcion)
            .Select(c => new CoseguroDto
            {
                Id          = c.Id,
                Descripcion = c.Descripcion,
                Porcentaje  = c.Porcentaje,
                ValorFijo   = c.ValorFijo,
                Tipo        = c.Tipo,
                Activo      = c.Activo,
                PlanId      = c.PlanId,
                Plan        = c.Plan.Nombre,
                ObraSocial  = c.Plan.ObraSocial.Nombre
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CoseguroDto>> ObtenerPorId(int id)
    {
        var c = await db.Coseguros.Include(x => x.Plan).ThenInclude(p => p.ObraSocial).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        return Ok(new CoseguroDto { Id = c.Id, Descripcion = c.Descripcion, Porcentaje = c.Porcentaje, ValorFijo = c.ValorFijo, Tipo = c.Tipo, Activo = c.Activo, PlanId = c.PlanId, Plan = c.Plan.Nombre, ObraSocial = c.Plan.ObraSocial.Nombre });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<CoseguroDto>> Crear([FromBody] CrearEditarCoseguroDto dto)
    {
        var nuevo = new Coseguro { Descripcion = dto.Descripcion, Porcentaje = dto.Porcentaje, ValorFijo = dto.ValorFijo, Tipo = dto.Tipo, Activo = dto.Activo, PlanId = dto.PlanId, FechaCreacion = DateTime.UtcNow };
        db.Coseguros.Add(nuevo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, new CoseguroDto { Id = nuevo.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<CoseguroDto>> Actualizar(int id, [FromBody] CrearEditarCoseguroDto dto)
    {
        var c = await db.Coseguros.FindAsync(id);
        if (c is null) return NotFound();
        c.Descripcion = dto.Descripcion; c.Porcentaje = dto.Porcentaje; c.ValorFijo = dto.ValorFijo; c.Tipo = dto.Tipo; c.Activo = dto.Activo; c.PlanId = dto.PlanId;
        await db.SaveChangesAsync();
        return Ok(new CoseguroDto { Id = c.Id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var c = await db.Coseguros.FindAsync(id);
        if (c is null) return NotFound();
        db.Coseguros.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
