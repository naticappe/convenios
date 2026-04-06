using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Controllers;

/// <summary>
/// Gestión del historial de vigencias de un Plan.
/// Ruta: api/planes/{planId}/vigencias
/// </summary>
[ApiController]
[Route("api/planes/{planId:int}/vigencias")]
[Authorize]
public class VigenciasPlanController(ApplicationDbContext db) : ControllerBase
{
    // GET api/planes/5/vigencias
    [HttpGet]
    public async Task<ActionResult<List<VigenciaPlanDto>>> Listar(int planId)
    {
        var existe = await db.Planes.AnyAsync(p => p.Id == planId);
        if (!existe) return NotFound(new { mensaje = "Plan no encontrado." });

        var lista = await db.VigenciasPlan
            .Where(v => v.PlanId == planId)
            .OrderByDescending(v => v.FechaDesde)
            .Select(v => new VigenciaPlanDto
            {
                Id            = v.Id,
                PlanId        = v.PlanId,
                Estado        = v.Estado.ToString(),
                FechaDesde    = v.FechaDesde,
                FechaHasta    = v.FechaHasta,
                Observaciones = v.Observaciones
            })
            .ToListAsync();

        return Ok(lista);
    }

    // POST api/planes/5/vigencias  — registra un nuevo estado
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<VigenciaPlanDto>> Crear(int planId, [FromBody] CrearVigenciaPlanDto dto)
    {
        var existe = await db.Planes.AnyAsync(p => p.Id == planId);
        if (!existe) return NotFound(new { mensaje = "Plan no encontrado." });

        if (!Enum.TryParse<EstadoPlan>(dto.Estado, out var estado))
            return BadRequest(new { mensaje = "Estado inválido. Use: Activo o Baja." });

        // Cerrar la vigencia anterior (la que tiene FechaHasta nula)
        var anterior = await db.VigenciasPlan
            .Where(v => v.PlanId == planId && v.FechaHasta == null)
            .FirstOrDefaultAsync();

        if (anterior is not null)
            anterior.FechaHasta = dto.FechaDesde.ToUniversalTime().AddSeconds(-1);

        var nueva = new VigenciaPlan
        {
            PlanId        = planId,
            Estado        = estado,
            FechaDesde    = dto.FechaDesde.ToUniversalTime(),
            Observaciones = dto.Observaciones
        };

        db.VigenciasPlan.Add(nueva);
        await db.SaveChangesAsync();

        return Ok(new VigenciaPlanDto
        {
            Id            = nueva.Id,
            PlanId        = nueva.PlanId,
            Estado        = nueva.Estado.ToString(),
            FechaDesde    = nueva.FechaDesde,
            FechaHasta    = nueva.FechaHasta,
            Observaciones = nueva.Observaciones
        });
    }

    // PUT api/planes/5/vigencias/3  — editar una vigencia existente (solo Admin)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<VigenciaPlanDto>> Editar(int planId, int id, [FromBody] CrearVigenciaPlanDto dto)
    {
        var vigencia = await db.VigenciasPlan
            .FirstOrDefaultAsync(v => v.Id == id && v.PlanId == planId);

        if (vigencia is null) return NotFound(new { mensaje = "Vigencia no encontrada." });

        if (!Enum.TryParse<EstadoPlan>(dto.Estado, out var estado))
            return BadRequest(new { mensaje = "Estado inválido. Use: Activo o Baja." });

        vigencia.Estado        = estado;
        vigencia.FechaDesde    = dto.FechaDesde.ToUniversalTime();
        vigencia.Observaciones = dto.Observaciones;

        await db.SaveChangesAsync();

        return Ok(new VigenciaPlanDto
        {
            Id            = vigencia.Id,
            PlanId        = vigencia.PlanId,
            Estado        = vigencia.Estado.ToString(),
            FechaDesde    = vigencia.FechaDesde,
            FechaHasta    = vigencia.FechaHasta,
            Observaciones = vigencia.Observaciones
        });
    }
}
