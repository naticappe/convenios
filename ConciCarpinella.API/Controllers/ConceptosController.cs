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
public class ConceptosController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ConceptoDto>>> ObtenerTodos([FromQuery] string? tipo)
    {
        var query = db.Conceptos.AsQueryable();
        if (!string.IsNullOrWhiteSpace(tipo)) query = query.Where(c => c.Tipo == tipo);

        var lista = await query
            .OrderBy(c => c.Tipo).ThenBy(c => c.Nombre)
            .Select(c => new ConceptoDto { Id = c.Id, Nombre = c.Nombre, Descripcion = c.Descripcion, Tipo = c.Tipo, Codigo = c.Codigo, Activo = c.Activo, FechaCreacion = c.FechaCreacion })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConceptoDto>> ObtenerPorId(int id)
    {
        var c = await db.Conceptos.FindAsync(id);
        if (c is null) return NotFound();
        return Ok(new ConceptoDto { Id = c.Id, Nombre = c.Nombre, Descripcion = c.Descripcion, Tipo = c.Tipo, Codigo = c.Codigo, Activo = c.Activo, FechaCreacion = c.FechaCreacion });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoDto>> Crear([FromBody] CrearEditarConceptoDto dto)
    {
        var nuevo = new Concepto { Nombre = dto.Nombre, Descripcion = dto.Descripcion, Tipo = dto.Tipo, Codigo = dto.Codigo, Activo = dto.Activo, FechaCreacion = DateTime.UtcNow };
        db.Conceptos.Add(nuevo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, new ConceptoDto { Id = nuevo.Id, Nombre = nuevo.Nombre, Tipo = nuevo.Tipo, Activo = nuevo.Activo, FechaCreacion = nuevo.FechaCreacion });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoDto>> Actualizar(int id, [FromBody] CrearEditarConceptoDto dto)
    {
        var c = await db.Conceptos.FindAsync(id);
        if (c is null) return NotFound();
        c.Nombre = dto.Nombre; c.Descripcion = dto.Descripcion; c.Tipo = dto.Tipo; c.Codigo = dto.Codigo; c.Activo = dto.Activo;
        await db.SaveChangesAsync();
        return Ok(new ConceptoDto { Id = c.Id, Nombre = c.Nombre });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var c = await db.Conceptos.FindAsync(id);
        if (c is null) return NotFound();
        c.Activo = false;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
