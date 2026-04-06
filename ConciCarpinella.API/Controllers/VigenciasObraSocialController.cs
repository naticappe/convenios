// ============================================================
// CONTROLADOR DE VIGENCIAS DE OBRA SOCIAL
// Gestiona el historial de estados (Activa / Suspendida / Baja).
// Ruta: api/obrassociales/{obraSocialId}/vigencias
// ============================================================

using ConciCarpinella.API.Data;
using ConciCarpinella.API.DTOs;
using ConciCarpinella.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Controllers;

[ApiController]
[Route("api/obrassociales/{obraSocialId:int}/vigencias")]
[Authorize]
public class VigenciasObraSocialController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>Retorna todo el historial de vigencias de una obra social, ordenado por fecha desc.</summary>
    [HttpGet]
    public async Task<ActionResult<List<VigenciaObraSocialDto>>> Listar(int obraSocialId)
    {
        if (!await db.ObrasSociales.AnyAsync(o => o.Id == obraSocialId))
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {obraSocialId}." });

        var vigencias = await db.VigenciasObraSocial
            .Where(v => v.ObraSocialId == obraSocialId)
            .OrderByDescending(v => v.FechaDesde)
            .Select(v => new VigenciaObraSocialDto
            {
                Id            = v.Id,
                ObraSocialId  = v.ObraSocialId,
                Estado        = v.Estado.ToString(),
                FechaDesde    = v.FechaDesde,
                FechaHasta    = v.FechaHasta,
                Observaciones = v.Observaciones
            })
            .ToListAsync();

        return Ok(vigencias);
    }

    /// <summary>
    /// Registra un nuevo estado para la obra social.
    /// Cierra automáticamente la vigencia anterior (establece FechaHasta = FechaDesde del nuevo estado).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<VigenciaObraSocialDto>> Crear(
        int obraSocialId,
        [FromBody] CrearVigenciaObraSocialDto dto)
    {
        if (!await db.ObrasSociales.AnyAsync(o => o.Id == obraSocialId))
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {obraSocialId}." });

        if (!Enum.TryParse<EstadoObraSocial>(dto.Estado, true, out var estadoEnum))
            return BadRequest(new { mensaje = $"Estado inválido '{dto.Estado}'. Valores posibles: Activa, Suspendida, Baja." });

        // Cerrar la vigencia actual (la que no tiene FechaHasta)
        var vigenciaActual = await db.VigenciasObraSocial
            .Where(v => v.ObraSocialId == obraSocialId && v.FechaHasta == null)
            .FirstOrDefaultAsync();

        if (vigenciaActual is not null)
            vigenciaActual.FechaHasta = dto.FechaDesde;

        // Crear la nueva vigencia
        var nueva = new VigenciaObraSocial
        {
            ObraSocialId  = obraSocialId,
            Estado        = estadoEnum,
            FechaDesde    = dto.FechaDesde,
            FechaHasta    = null,
            Observaciones = dto.Observaciones
        };

        db.VigenciasObraSocial.Add(nueva);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Listar), new { obraSocialId }, MapearDto(nueva));
    }

    /// <summary>
    /// Actualiza la fecha de inicio o las observaciones de una vigencia específica.
    /// No se puede cambiar el estado (para eso se crea una nueva vigencia).
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<VigenciaObraSocialDto>> Actualizar(
        int obraSocialId,
        int id,
        [FromBody] CrearVigenciaObraSocialDto dto)
    {
        var vigencia = await db.VigenciasObraSocial
            .FirstOrDefaultAsync(v => v.Id == id && v.ObraSocialId == obraSocialId);

        if (vigencia is null)
            return NotFound(new { mensaje = $"No se encontró la vigencia con ID {id}." });

        if (!Enum.TryParse<EstadoObraSocial>(dto.Estado, true, out var estadoEnum))
            return BadRequest(new { mensaje = $"Estado inválido '{dto.Estado}'." });

        vigencia.Estado        = estadoEnum;
        vigencia.FechaDesde    = dto.FechaDesde;
        vigencia.Observaciones = dto.Observaciones;

        await db.SaveChangesAsync();
        return Ok(MapearDto(vigencia));
    }

    // ── Mapeador ────────────────────────────────────────────────
    private static VigenciaObraSocialDto MapearDto(VigenciaObraSocial v) => new()
    {
        Id            = v.Id,
        ObraSocialId  = v.ObraSocialId,
        Estado        = v.Estado.ToString(),
        FechaDesde    = v.FechaDesde,
        FechaHasta    = v.FechaHasta,
        Observaciones = v.Observaciones
    };
}
