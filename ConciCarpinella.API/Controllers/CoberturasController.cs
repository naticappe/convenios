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
public class CoberturasController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CoberturaDto>>> ObtenerTodas(
        [FromQuery] int? planId, [FromQuery] int? practicaId)
    {
        var query = db.Coberturas
            .Include(c => c.Plan).ThenInclude(p => p.ObraSocial)
            .Include(c => c.Practica)
            .AsQueryable();

        if (planId.HasValue)     query = query.Where(c => c.PlanId == planId.Value);
        if (practicaId.HasValue) query = query.Where(c => c.PracticaId == practicaId.Value);

        var lista = await query
            .OrderBy(c => c.Plan.ObraSocial.Nombre).ThenBy(c => c.Plan.Nombre)
            .Select(c => new CoberturaDto
            {
                Id                   = c.Id,
                PorcentajeCubierto   = c.PorcentajeCubierto,
                RequiereAutorizacion = c.RequiereAutorizacion,
                LimiteSesiones       = c.LimiteSesiones,
                PeriodoLimite        = c.PeriodoLimite,
                Activa               = c.Activa,
                Observaciones        = c.Observaciones,
                PlanId               = c.PlanId,
                Plan                 = c.Plan.Nombre,
                ObraSocial           = c.Plan.ObraSocial.Nombre,
                PracticaId           = c.PracticaId,
                Practica             = c.Practica.Nombre,
                CodigoPractica       = c.Practica.Codigo
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CoberturaDto>> ObtenerPorId(int id)
    {
        var c = await db.Coberturas
            .Include(x => x.Plan).ThenInclude(p => p.ObraSocial)
            .Include(x => x.Practica)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (c is null) return NotFound();

        return Ok(new CoberturaDto
        {
            Id = c.Id, PorcentajeCubierto = c.PorcentajeCubierto,
            RequiereAutorizacion = c.RequiereAutorizacion, LimiteSesiones = c.LimiteSesiones,
            PeriodoLimite = c.PeriodoLimite, Activa = c.Activa, Observaciones = c.Observaciones,
            PlanId = c.PlanId, Plan = c.Plan.Nombre, ObraSocial = c.Plan.ObraSocial.Nombre,
            PracticaId = c.PracticaId, Practica = c.Practica.Nombre, CodigoPractica = c.Practica.Codigo
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<CoberturaDto>> Crear([FromBody] CrearEditarCoberturaDto dto)
    {
        var existe = await db.Coberturas.AnyAsync(c => c.PlanId == dto.PlanId && c.PracticaId == dto.PracticaId);
        if (existe) return BadRequest(new { mensaje = "Ya existe una cobertura para ese plan y práctica." });

        var nueva = new Cobertura
        {
            PorcentajeCubierto   = dto.PorcentajeCubierto,
            RequiereAutorizacion = dto.RequiereAutorizacion,
            LimiteSesiones       = dto.LimiteSesiones,
            PeriodoLimite        = dto.PeriodoLimite,
            Activa               = dto.Activa,
            Observaciones        = dto.Observaciones,
            PlanId               = dto.PlanId,
            PracticaId           = dto.PracticaId,
            FechaCreacion        = DateTime.UtcNow
        };

        db.Coberturas.Add(nueva);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = nueva.Id }, new CoberturaDto { Id = nueva.Id });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<CoberturaDto>> Actualizar(int id, [FromBody] CrearEditarCoberturaDto dto)
    {
        var c = await db.Coberturas.FindAsync(id);
        if (c is null) return NotFound();

        c.PorcentajeCubierto   = dto.PorcentajeCubierto;
        c.RequiereAutorizacion = dto.RequiereAutorizacion;
        c.LimiteSesiones       = dto.LimiteSesiones;
        c.PeriodoLimite        = dto.PeriodoLimite;
        c.Activa               = dto.Activa;
        c.Observaciones        = dto.Observaciones;
        c.PlanId               = dto.PlanId;
        c.PracticaId           = dto.PracticaId;

        await db.SaveChangesAsync();
        return Ok(new CoberturaDto { Id = c.Id });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var c = await db.Coberturas.FindAsync(id);
        if (c is null) return NotFound();
        db.Coberturas.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
