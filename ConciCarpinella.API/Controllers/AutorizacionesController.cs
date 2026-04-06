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
public class AutorizacionesController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<AutorizacionListDto>>> ObtenerTodas(
        [FromQuery] string? estado,
        [FromQuery] int? planId,
        [FromQuery] string? buscarPaciente)
    {
        var query = db.Autorizaciones
            .Include(a => a.Plan).ThenInclude(p => p.ObraSocial)
            .Include(a => a.Practica)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(a => a.Estado == estado);

        if (planId.HasValue)
            query = query.Where(a => a.PlanId == planId.Value);

        if (!string.IsNullOrWhiteSpace(buscarPaciente))
            query = query.Where(a =>
                a.NombrePaciente.Contains(buscarPaciente) ||
                a.ApellidoPaciente.Contains(buscarPaciente) ||
                a.Numero.Contains(buscarPaciente));

        var lista = await query
            .OrderByDescending(a => a.FechaSolicitud)
            .Select(a => new AutorizacionListDto
            {
                Id               = a.Id,
                Numero           = a.Numero,
                Paciente         = $"{a.ApellidoPaciente}, {a.NombrePaciente}",
                Practica         = a.Practica.Nombre,
                Plan             = a.Plan.Nombre,
                ObraSocial       = a.Plan.ObraSocial.Nombre,
                Estado           = a.Estado,
                FechaSolicitud   = a.FechaSolicitud,
                FechaVencimiento = a.FechaVencimiento
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AutorizacionDto>> ObtenerPorId(int id)
    {
        var a = await db.Autorizaciones
            .Include(x => x.Plan).ThenInclude(p => p.ObraSocial)
            .Include(x => x.Practica)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (a is null)
            return NotFound(new { mensaje = $"No se encontró la autorización con ID {id}." });

        return Ok(MapearDto(a));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry,Secretario")]
    public async Task<ActionResult<AutorizacionDto>> Crear([FromBody] CrearEditarAutorizacionDto dto)
    {
        var existe = await db.Autorizaciones.AnyAsync(a => a.Numero == dto.Numero);
        if (existe)
            return BadRequest(new { mensaje = $"Ya existe una autorización con número '{dto.Numero}'." });

        var nueva = new Autorizacion
        {
            Numero             = dto.Numero,
            NombrePaciente     = dto.NombrePaciente,
            ApellidoPaciente   = dto.ApellidoPaciente,
            DniPaciente        = dto.DniPaciente,
            NumeroAfiliado     = dto.NumeroAfiliado,
            Diagnostico        = dto.Diagnostico,
            Estado             = dto.Estado,
            FechaSolicitud     = DateTime.UtcNow,
            FechaVencimiento   = dto.FechaVencimiento,
            CantidadAutorizada = dto.CantidadAutorizada,
            Observaciones      = dto.Observaciones,
            PlanId             = dto.PlanId,
            PracticaId         = dto.PracticaId
        };

        db.Autorizaciones.Add(nueva);
        await db.SaveChangesAsync();

        await db.Entry(nueva).Reference(a => a.Plan).LoadAsync();
        await db.Entry(nueva.Plan).Reference(p => p.ObraSocial).LoadAsync();
        await db.Entry(nueva).Reference(a => a.Practica).LoadAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nueva.Id }, MapearDto(nueva));
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry,Secretario")]
    public async Task<ActionResult<AutorizacionDto>> Actualizar(int id, [FromBody] CrearEditarAutorizacionDto dto)
    {
        var a = await db.Autorizaciones
            .Include(x => x.Plan).ThenInclude(p => p.ObraSocial)
            .Include(x => x.Practica)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (a is null)
            return NotFound(new { mensaje = $"No se encontró la autorización con ID {id}." });

        a.NombrePaciente     = dto.NombrePaciente;
        a.ApellidoPaciente   = dto.ApellidoPaciente;
        a.DniPaciente        = dto.DniPaciente;
        a.NumeroAfiliado     = dto.NumeroAfiliado;
        a.Diagnostico        = dto.Diagnostico;
        a.Estado             = dto.Estado;
        a.FechaVencimiento   = dto.FechaVencimiento;
        a.CantidadAutorizada = dto.CantidadAutorizada;
        a.Observaciones      = dto.Observaciones;
        a.PlanId             = dto.PlanId;
        a.PracticaId         = dto.PracticaId;

        if (dto.Estado == EstadoAutorizacion.Utilizada && a.FechaUtilizacion is null)
            a.FechaUtilizacion = DateTime.UtcNow;

        await db.SaveChangesAsync();

        return Ok(MapearDto(a));
    }

    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = "Admin,DataEntry,Secretario")]
    public async Task<IActionResult> CambiarEstado(int id, [FromBody] string nuevoEstado)
    {
        var a = await db.Autorizaciones.FindAsync(id);
        if (a is null)
            return NotFound();

        a.Estado = nuevoEstado;
        if (nuevoEstado == EstadoAutorizacion.Utilizada)
            a.FechaUtilizacion = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var a = await db.Autorizaciones.FindAsync(id);
        if (a is null)
            return NotFound(new { mensaje = $"No se encontró la autorización con ID {id}." });

        db.Autorizaciones.Remove(a);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static AutorizacionDto MapearDto(Autorizacion a) => new()
    {
        Id                 = a.Id,
        Numero             = a.Numero,
        NombrePaciente     = a.NombrePaciente,
        ApellidoPaciente   = a.ApellidoPaciente,
        DniPaciente        = a.DniPaciente,
        NumeroAfiliado     = a.NumeroAfiliado,
        Diagnostico        = a.Diagnostico,
        Estado             = a.Estado,
        FechaSolicitud     = a.FechaSolicitud,
        FechaVencimiento   = a.FechaVencimiento,
        FechaUtilizacion   = a.FechaUtilizacion,
        CantidadAutorizada = a.CantidadAutorizada,
        Observaciones      = a.Observaciones,
        PlanId             = a.PlanId,
        Plan               = a.Plan?.Nombre ?? "",
        ObraSocial         = a.Plan?.ObraSocial?.Nombre ?? "",
        PracticaId         = a.PracticaId,
        Practica           = a.Practica?.Nombre ?? "",
        CodigoPractica     = a.Practica?.Codigo ?? ""
    };
}
