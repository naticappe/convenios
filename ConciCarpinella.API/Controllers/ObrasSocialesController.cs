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
public class ObrasSocialesController(ApplicationDbContext db) : ControllerBase
{
    /// <summary>
    /// Lista obras sociales con filtros opcionales por codigo, sigla o nombre.
    /// El estado actual se deriva de la última vigencia registrada.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ObraSocialListDto>>> ObtenerTodas(
        [FromQuery] string? buscar,
        [FromQuery] string? estado)
    {
        var query = db.ObrasSociales.AsQueryable();

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            // Si el texto ingresado es numérico, busca por código exacto;
            // de lo contrario busca por nombre o sigla (contains, case-insensitive)
            if (int.TryParse(buscar.Trim(), out var codigoBuscado))
                query = query.Where(o => o.Codigo == codigoBuscado);
            else
                query = query.Where(o =>
                    o.Nombre.ToLower().Contains(buscar.ToLower()) ||
                    (o.Sigla != null && o.Sigla.ToLower().Contains(buscar.ToLower())));
        }

        var raw = await query
            .Include(o => o.Vigencias)
            .OrderBy(o => o.Nombre)
            .ToListAsync();

        var lista = raw.Select(o => new ObraSocialListDto
        {
            Id             = o.Id,
            Codigo         = o.Codigo,
            Sigla          = o.Sigla,
            Nombre         = o.Nombre,
            Cuit           = o.Cuit,
            CantidadPlanes = o.Planes.Count(),
            Estado         = o.Vigencias
                              .OrderByDescending(v => v.FechaDesde)
                              .Select(v => v.Estado.ToString())
                              .FirstOrDefault() ?? "Activa"
        }).ToList();

        if (!string.IsNullOrWhiteSpace(estado))
            lista = lista.Where(o => o.Estado == estado).ToList();

        return Ok(lista);
    }

    /// <summary>Detalle completo de una obra social</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ObraSocialDto>> ObtenerPorId(int id)
    {
        var obra = await db.ObrasSociales
            .Include(o => o.Planes).ThenInclude(p => p.Vigencias)
            .Include(o => o.Vigencias)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (obra is null)
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {id}." });

        return Ok(MapearDto(obra));
    }

    /// <summary>Crea una nueva obra social con vigencia inicial Activa</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ObraSocialDto>> Crear([FromBody] CrearEditarObraSocialDto dto)
    {
        if (await db.ObrasSociales.AnyAsync(o => o.Codigo == dto.Codigo))
            return BadRequest(new { mensaje = $"Ya existe una obra social con código {dto.Codigo}." });

        if (!string.IsNullOrWhiteSpace(dto.Cuit) &&
            await db.ObrasSociales.AnyAsync(o => o.Cuit == dto.Cuit))
            return BadRequest(new { mensaje = $"Ya existe una obra social con CUIT '{dto.Cuit}'." });

        var nueva = new ObraSocial
        {
            Codigo        = dto.Codigo,
            Sigla         = dto.Sigla,
            Nombre        = dto.Nombre,
            Cuit          = dto.Cuit,
            Observaciones = dto.Observaciones,
            FechaCreacion = DateTime.UtcNow
        };

        db.ObrasSociales.Add(nueva);
        await db.SaveChangesAsync();

        // Vigencia inicial: Activa desde hoy
        db.VigenciasObraSocial.Add(new VigenciaObraSocial
        {
            ObraSocialId  = nueva.Id,
            Estado        = EstadoObraSocial.Activa,
            FechaDesde    = DateTime.UtcNow,
            Observaciones = "Alta inicial"
        });
        await db.SaveChangesAsync();

        await db.Entry(nueva).Collection(o => o.Vigencias).LoadAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nueva.Id }, MapearDto(nueva));
    }

    /// <summary>Actualiza los datos maestros de una obra social (sin tocar el estado)</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ObraSocialDto>> Actualizar(int id, [FromBody] CrearEditarObraSocialDto dto)
    {
        var obra = await db.ObrasSociales
            .Include(o => o.Vigencias)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (obra is null)
            return NotFound(new { mensaje = $"No se encontró la obra social con ID {id}." });

        if (dto.Codigo != obra.Codigo &&
            await db.ObrasSociales.AnyAsync(o => o.Codigo == dto.Codigo && o.Id != id))
            return BadRequest(new { mensaje = $"Ya existe una obra social con código {dto.Codigo}." });

        if (!string.IsNullOrWhiteSpace(dto.Cuit) && dto.Cuit != obra.Cuit &&
            await db.ObrasSociales.AnyAsync(o => o.Cuit == dto.Cuit && o.Id != id))
            return BadRequest(new { mensaje = $"Ya existe una obra social con CUIT '{dto.Cuit}'." });

        obra.Codigo        = dto.Codigo;
        obra.Sigla         = dto.Sigla;
        obra.Nombre        = dto.Nombre;
        obra.Cuit          = dto.Cuit;
        obra.Observaciones = dto.Observaciones;

        await db.SaveChangesAsync();

        return Ok(MapearDto(obra));
    }

    // ── Mapeador ────────────────────────────────────────────────
    private static ObraSocialDto MapearDto(ObraSocial o) => new()
    {
        Id            = o.Id,
        Codigo        = o.Codigo,
        Sigla         = o.Sigla,
        Nombre        = o.Nombre,
        Cuit          = o.Cuit,
        Observaciones = o.Observaciones,
        FechaCreacion = o.FechaCreacion,
        Estado        = o.Vigencias
                         .OrderByDescending(v => v.FechaDesde)
                         .Select(v => v.Estado.ToString())
                         .FirstOrDefault() ?? "Activa",
        Planes        = o.Planes?.Select(p => new PlanListDto
        {
            Id           = p.Id,
            Nombre       = p.Nombre,
            Alias        = p.Alias,
            TipoIva      = p.TipoIva.ToString(),
            ObraSocialId = p.ObraSocialId,
            ObraSocial   = o.Nombre,
            Estado       = p.Vigencias
                            .OrderByDescending(v => v.FechaDesde)
                            .Select(v => v.Estado.ToString())
                            .FirstOrDefault() ?? "Activo"
        }).ToList() ?? new()
    };
}
