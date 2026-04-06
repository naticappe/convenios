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
public class PlanesController(ApplicationDbContext db) : ControllerBase
{
    // GET api/planes?obraSocialId=1&nombre=salud&estado=Activo
    [HttpGet]
    public async Task<ActionResult<List<PlanListDto>>> ObtenerTodos(
        [FromQuery] int?    obraSocialId,
        [FromQuery] string? nombre,
        [FromQuery] string? estado)
    {
        var query = db.Planes
            .Include(p => p.ObraSocial)
            .Include(p => p.Vigencias)
            .AsQueryable();

        if (obraSocialId.HasValue)
            query = query.Where(p => p.ObraSocialId == obraSocialId.Value);

        if (!string.IsNullOrWhiteSpace(nombre))
            query = query.Where(p => p.Nombre.ToLower().Contains(nombre.ToLower()));

        var lista = await query
            .OrderBy(p => p.ObraSocial.Nombre)
            .ThenBy(p => p.Nombre)
            .ToListAsync();

        // Derivar el estado desde la última vigencia
        var resultado = lista.Select(p =>
        {
            var estadoActual = p.Vigencias
                .OrderByDescending(v => v.FechaDesde)
                .Select(v => v.Estado.ToString())
                .FirstOrDefault() ?? "Activo";

            return new PlanListDto
            {
                Id            = p.Id,
                Nombre        = p.Nombre,
                Alias         = p.Alias,
                TipoIva       = p.TipoIva.ToString(),
                ObraSocial    = p.ObraSocial.Nombre,
                ObraSocialId  = p.ObraSocialId,
                Estado        = estadoActual,
                EsAutogestion = p.EsAutogestion
            };
        });

        // Filtrar por estado si se solicitó
        if (!string.IsNullOrWhiteSpace(estado))
            resultado = resultado.Where(p => p.Estado == estado);

        return Ok(resultado.ToList());
    }

    // GET api/planes/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PlanDetalleDto>> ObtenerPorId(int id)
    {
        var plan = await db.Planes
            .Include(p => p.ObraSocial)
            .Include(p => p.Vigencias)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (plan is null)
            return NotFound(new { mensaje = $"No se encontró el plan con ID {id}." });

        return Ok(MapearDetalle(plan));
    }

    // POST api/planes
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PlanDetalleDto>> Crear([FromBody] CrearEditarPlanDto dto)
    {
        var obraExiste = await db.ObrasSociales.AnyAsync(o => o.Id == dto.ObraSocialId);
        if (!obraExiste)
            return BadRequest(new { mensaje = "La obra social indicada no existe." });

        if (!Enum.TryParse<TipoIva>(dto.TipoIva, out var tipoIva))
            return BadRequest(new { mensaje = "Tipo de IVA inválido. Use: Exento, Gravado105 o Gravado21." });

        var nuevo = new Plan
        {
            Nombre        = dto.Nombre,
            Alias         = dto.Alias,
            Descripcion   = dto.Descripcion,
            TipoIva       = tipoIva,
            EsAutogestion = dto.EsAutogestion,
            ObraSocialId  = dto.ObraSocialId,
            FechaCreacion = DateTime.UtcNow
        };

        db.Planes.Add(nuevo);
        await db.SaveChangesAsync();

        // Crear la vigencia inicial
        var vigencia = new VigenciaPlan
        {
            PlanId     = nuevo.Id,
            Estado     = EstadoPlan.Activo,
            FechaDesde = dto.FechaDesde.ToUniversalTime(),
            FechaHasta = dto.FechaHasta.HasValue ? dto.FechaHasta.Value.ToUniversalTime() : null
        };
        db.VigenciasPlan.Add(vigencia);
        await db.SaveChangesAsync();

        await db.Entry(nuevo).Reference(p => p.ObraSocial).LoadAsync();
        await db.Entry(nuevo).Collection(p => p.Vigencias).LoadAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, MapearDetalle(nuevo));
    }

    // PUT api/planes/5
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PlanDetalleDto>> Actualizar(int id, [FromBody] CrearEditarPlanDto dto)
    {
        var plan = await db.Planes
            .Include(p => p.ObraSocial)
            .Include(p => p.Vigencias)
            .FirstOrDefaultAsync(p => p.Id == id);

        if (plan is null)
            return NotFound(new { mensaje = $"No se encontró el plan con ID {id}." });

        if (!Enum.TryParse<TipoIva>(dto.TipoIva, out var tipoIva))
            return BadRequest(new { mensaje = "Tipo de IVA inválido. Use: Exento, Gravado105 o Gravado21." });

        plan.Nombre        = dto.Nombre;
        plan.Alias         = dto.Alias;
        plan.Descripcion   = dto.Descripcion;
        plan.TipoIva       = tipoIva;
        plan.EsAutogestion = dto.EsAutogestion;
        plan.ObraSocialId  = dto.ObraSocialId;

        await db.SaveChangesAsync();

        return Ok(MapearDetalle(plan));
    }

    // ── Mapeo ─────────────────────────────────────────────────────
    private static PlanDetalleDto MapearDetalle(Plan p)
    {
        var estadoActual = p.Vigencias
            .OrderByDescending(v => v.FechaDesde)
            .Select(v => v.Estado.ToString())
            .FirstOrDefault() ?? "Activo";

        return new PlanDetalleDto
        {
            Id            = p.Id,
            Nombre        = p.Nombre,
            Alias         = p.Alias,
            Descripcion   = p.Descripcion,
            TipoIva       = p.TipoIva.ToString(),
            EsAutogestion = p.EsAutogestion,
            ObraSocialId  = p.ObraSocialId,
            ObraSocial    = p.ObraSocial?.Nombre ?? "",
            FechaCreacion = p.FechaCreacion,
            Estado        = estadoActual
        };
    }
}
