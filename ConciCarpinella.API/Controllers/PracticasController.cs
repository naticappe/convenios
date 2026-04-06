// ============================================================
// CONTROLLER: PracticasController
// Ruta base: /api/practicas
// Módulo completo: CRUD + vigencias + conceptos + auditoría
// + exportación Excel + importación en 2 pasos
// ============================================================

using System.Text.Json;
using ClosedXML.Excel;
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
public class PracticasController(ApplicationDbContext db) : ControllerBase
{
    // ══════════════════════════════════════════════════════════════
    // HELPERS
    // ══════════════════════════════════════════════════════════════

    private static bool DerivarActivo(DateTime desde, DateTime? hasta)
        => desde <= DateTime.UtcNow && (hasta is null || hasta > DateTime.UtcNow);

    private string ObtenerUsuarioNombre()
    {
        var nombre = User.FindFirst("nombre")?.Value ?? "";
        var apellido = User.FindFirst("apellido")?.Value ?? "";
        var full = $"{nombre} {apellido}".Trim();
        return string.IsNullOrEmpty(full) ? User.Identity?.Name ?? "sistema" : full;
    }

    private long? ObtenerUsuarioId()
    {
        var sub = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        return long.TryParse(sub, out var id) ? id : null;
    }

    private static PracticaConceptoUnidadDto MapearDetalle(PracticaConceptoUnidad d) => new()
    {
        Id                  = d.Id,
        PracticaId          = d.PracticaId,
        ConceptoMaestroId   = d.ConceptoMaestroId,
        ConceptoSigla       = d.ConceptoMaestro?.Sigla  ?? "",
        ConceptoNombre      = d.ConceptoMaestro?.Nombre ?? "",
        UnidadArancelId     = d.UnidadArancelId,
        UnidadArancelNombre = d.UnidadArancel?.Nombre   ?? "",
        Unidades            = d.Unidades,
        Cantidad            = d.Cantidad,
        VigenciaDesde       = d.VigenciaDesde.ToString("o"),
        VigenciaHasta       = d.VigenciaHasta?.ToString("o"),
        Activo              = d.Activo
    };

    private static PracticaListDto MapearLista(Practica p) => new()
    {
        Id                     = p.Id,
        Codigo                 = p.Codigo,
        Nombre                 = p.Nombre,
        NomencladorId          = p.NomencladorId,
        NomencladorNombre      = p.NomencladorMaestro?.Nombre ?? "",
        ClasificadorPracticaId = p.ClasificadorPracticaId,
        ClasificadorNombre     = p.ClasificadorPractica != null
            ? $"{p.ClasificadorPractica.Nivel1} / {p.ClasificadorPractica.Nivel2} / {p.ClasificadorPractica.Nivel3}"
            : null,
        VigenciaDesde = p.VigenciaDesde.ToString("o"),
        VigenciaHasta = p.VigenciaHasta?.ToString("o"),
        Activo        = p.Activo,
        Conceptos     = p.ConceptoUnidades
            .Where(d => d.Activo)
            .Select(d => new PracticaConceptoResumenDto
            {
                ConceptoId     = d.ConceptoMaestroId,
                ConceptoSigla  = d.ConceptoMaestro?.Sigla  ?? "",
                ConceptoNombre = d.ConceptoMaestro?.Nombre ?? ""
            }).ToList()
    };

    private static PracticaDto MapearDto(Practica p) => new()
    {
        Id                     = p.Id,
        Codigo                 = p.Codigo,
        Nombre                 = p.Nombre,
        NomencladorId          = p.NomencladorId,
        NomencladorNombre      = p.NomencladorMaestro?.Nombre ?? "",
        ClasificadorPracticaId = p.ClasificadorPracticaId,
        ClasificadorNombre     = p.ClasificadorPractica != null
            ? $"{p.ClasificadorPractica.Nivel1} / {p.ClasificadorPractica.Nivel2} / {p.ClasificadorPractica.Nivel3}"
            : null,
        VigenciaDesde    = p.VigenciaDesde.ToString("o"),
        VigenciaHasta    = p.VigenciaHasta?.ToString("o"),
        Activo           = p.Activo,
        CreatedAt        = p.CreatedAt.ToString("o"),
        UpdatedAt        = p.UpdatedAt.ToString("o"),
        CreatedBy        = p.CreatedBy,
        UpdatedBy        = p.UpdatedBy,
        Conceptos        = p.ConceptoUnidades
            .Where(d => d.Activo)
            .Select(d => new PracticaConceptoResumenDto
            {
                ConceptoId     = d.ConceptoMaestroId,
                ConceptoSigla  = d.ConceptoMaestro?.Sigla  ?? "",
                ConceptoNombre = d.ConceptoMaestro?.Nombre ?? ""
            }).ToList(),
        ConceptoUnidades = p.ConceptoUnidades
            .Select(MapearDetalle).ToList()
    };

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas
    // ══════════════════════════════════════════════════════════════
    [HttpGet]
    public async Task<ActionResult<List<PracticaListDto>>> Listar(
        [FromQuery] int?    nomencladorId,
        [FromQuery] int?    clasificadorId,
        [FromQuery] string? estado,
        [FromQuery] string? buscar)
    {
        // El filtro por nomenclador es OBLIGATORIO según spec
        if (!nomencladorId.HasValue)
            return BadRequest(new { mensaje = "El filtro ?nomencladorId= es obligatorio." });

        var query = db.Practicas
            .Include(p => p.NomencladorMaestro)
            .Include(p => p.ClasificadorPractica)
            .Include(p => p.ConceptoUnidades).ThenInclude(d => d.ConceptoMaestro)
            .Where(p => p.NomencladorId == nomencladorId.Value)
            .AsQueryable();

        if (clasificadorId.HasValue)
            query = query.Where(p => p.ClasificadorPracticaId == clasificadorId.Value);

        if (!string.IsNullOrWhiteSpace(estado))
        {
            bool activo = estado.Equals("Activo", StringComparison.OrdinalIgnoreCase);
            query = query.Where(p => p.Activo == activo);
        }

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(p =>
                EF.Functions.ILike(p.Codigo, $"%{buscar}%") ||
                EF.Functions.ILike(p.Nombre, $"%{buscar}%"));

        var lista = await query
            .OrderBy(p => p.Codigo)
            .ToListAsync();

        return Ok(lista.Select(MapearLista).ToList());
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas/{id}
    // ══════════════════════════════════════════════════════════════
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PracticaDto>> ObtenerPorId(int id)
    {
        var p = await db.Practicas
            .Include(x => x.NomencladorMaestro)
            .Include(x => x.ClasificadorPractica)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.ConceptoMaestro)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.UnidadArancel)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p is null)
            return NotFound(new { mensaje = $"No se encontró la práctica con ID {id}." });

        return Ok(MapearDto(p));
    }

    // ══════════════════════════════════════════════════════════════
    // POST /api/practicas
    // ══════════════════════════════════════════════════════════════
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaDto>> Crear([FromBody] CrearEditarPracticaDto dto)
    {
        var errorDto = await ValidarDto(dto);
        if (errorDto != null) return errorDto;

        await ValidarUnicidad(dto.NomencladorId, dto.Codigo, null);

        // Usar las fechas del DTO si se proveen; si no, vigenciaDesde = ahora, vigenciaHasta = indefinida.
        var vigDesde = dto.VigenciaDesde.HasValue
            ? DateTime.SpecifyKind(dto.VigenciaDesde.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;
        var vigHasta = dto.VigenciaHasta.HasValue
            ? DateTime.SpecifyKind(dto.VigenciaHasta.Value, DateTimeKind.Utc)
            : (DateTime?)null;

        var nueva = new Practica
        {
            Codigo                 = dto.Codigo.Trim(),
            Nombre                 = dto.Nombre.Trim(),
            NomencladorId          = dto.NomencladorId,
            ClasificadorPracticaId = dto.ClasificadorPracticaId,
            VigenciaDesde          = vigDesde,
            VigenciaHasta          = vigHasta,
            CreatedAt              = DateTime.UtcNow,
            UpdatedAt              = DateTime.UtcNow,
            CreatedBy              = ObtenerUsuarioId(),
            UpdatedBy              = ObtenerUsuarioId()
        };
        nueva.Activo = DerivarActivo(nueva.VigenciaDesde, nueva.VigenciaHasta);

        db.Practicas.Add(nueva);
        await db.SaveChangesAsync();

        // Log ALTA
        db.PracticaAuditLogs.Add(new PracticaAuditLog
        {
            PracticaId    = nueva.Id,
            Accion        = "ALTA",
            Entidad       = "PRACTICA",
            FechaEvento   = DateTime.UtcNow,
            UsuarioId     = ObtenerUsuarioId(),
            UsuarioNombre = ObtenerUsuarioNombre(),
            Origen        = "MANUAL",
            DatosAnteriores = null,
            DatosNuevos   = JsonSerializer.Serialize(new { nueva.Codigo, nueva.Nombre, nueva.NomencladorId, nueva.ClasificadorPracticaId, nueva.VigenciaDesde, nueva.VigenciaHasta })
        });
        await db.SaveChangesAsync();

        await db.Entry(nueva).Reference(x => x.NomencladorMaestro).LoadAsync();
        await db.Entry(nueva).Collection(x => x.ConceptoUnidades).LoadAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nueva.Id }, MapearDto(nueva));
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /api/practicas/{id}
    // ══════════════════════════════════════════════════════════════
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaDto>> Actualizar(int id, [FromBody] CrearEditarPracticaDto dto)
    {
        var p = await db.Practicas
            .Include(x => x.NomencladorMaestro)
            .Include(x => x.ClasificadorPractica)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.ConceptoMaestro)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.UnidadArancel)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p is null)
            return NotFound(new { mensaje = $"No se encontró la práctica con ID {id}." });

        var errorDto = await ValidarDto(dto);
        if (errorDto != null) return errorDto;

        // Solo log si hay cambios reales
        bool hayCambio = p.Codigo != dto.Codigo.Trim()
                      || p.Nombre != dto.Nombre.Trim()
                      || p.ClasificadorPracticaId != dto.ClasificadorPracticaId;

        if (hayCambio)
        {
            // Validar unicidad si cambió código o nomenclador
            if (p.Codigo != dto.Codigo.Trim() || p.NomencladorId != dto.NomencladorId)
                await ValidarUnicidad(dto.NomencladorId, dto.Codigo, id);

            var anterior = JsonSerializer.Serialize(new { p.Codigo, p.Nombre, p.ClasificadorPracticaId });

            p.Codigo                 = dto.Codigo.Trim();
            p.Nombre                 = dto.Nombre.Trim();
            p.NomencladorId          = dto.NomencladorId;
            p.ClasificadorPracticaId = dto.ClasificadorPracticaId;
            p.UpdatedAt              = DateTime.UtcNow;
            p.UpdatedBy              = ObtenerUsuarioId();

            await db.SaveChangesAsync();

            db.PracticaAuditLogs.Add(new PracticaAuditLog
            {
                PracticaId      = p.Id,
                Accion          = "MODIFICACION",
                Entidad         = "PRACTICA",
                FechaEvento     = DateTime.UtcNow,
                UsuarioId       = ObtenerUsuarioId(),
                UsuarioNombre   = ObtenerUsuarioNombre(),
                Origen          = "MANUAL",
                DatosAnteriores = anterior,
                DatosNuevos     = JsonSerializer.Serialize(new { p.Codigo, p.Nombre, p.ClasificadorPracticaId })
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(p));
    }

    // ══════════════════════════════════════════════════════════════
    // PATCH /api/practicas/{id}/vigencia
    // ══════════════════════════════════════════════════════════════
    [HttpPatch("{id:int}/vigencia")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaDto>> ActualizarVigencia(int id, [FromBody] ActualizarVigenciaPracticaDto dto)
    {
        var p = await db.Practicas
            .Include(x => x.NomencladorMaestro)
            .Include(x => x.ClasificadorPractica)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.ConceptoMaestro)
            .Include(x => x.ConceptoUnidades).ThenInclude(d => d.UnidadArancel)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p is null)
            return NotFound(new { mensaje = $"No se encontró la práctica con ID {id}." });

        bool hayCambio = p.VigenciaDesde != dto.VigenciaDesde
                      || p.VigenciaHasta != dto.VigenciaHasta;

        if (hayCambio)
        {
            var anterior = JsonSerializer.Serialize(new { p.VigenciaDesde, p.VigenciaHasta, p.Activo });

            p.VigenciaDesde = dto.VigenciaDesde;
            p.VigenciaHasta = dto.VigenciaHasta;
            p.Activo        = DerivarActivo(p.VigenciaDesde, p.VigenciaHasta);
            p.UpdatedAt     = DateTime.UtcNow;
            p.UpdatedBy     = ObtenerUsuarioId();

            await db.SaveChangesAsync();

            db.PracticaAuditLogs.Add(new PracticaAuditLog
            {
                PracticaId      = p.Id,
                Accion          = "CAMBIO_VIGENCIA",
                Entidad         = "PRACTICA",
                FechaEvento     = DateTime.UtcNow,
                UsuarioId       = ObtenerUsuarioId(),
                UsuarioNombre   = ObtenerUsuarioNombre(),
                Origen          = "MANUAL",
                DatosAnteriores = anterior,
                DatosNuevos     = JsonSerializer.Serialize(new { p.VigenciaDesde, p.VigenciaHasta, p.Activo })
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(p));
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas/{id}/conceptos
    // ══════════════════════════════════════════════════════════════
    [HttpGet("{id:int}/conceptos")]
    public async Task<ActionResult<List<PracticaConceptoUnidadDto>>> ListarConceptos(int id)
    {
        var existe = await db.Practicas.AnyAsync(p => p.Id == id);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró la práctica con ID {id}." });

        var detalles = await db.PracticaConceptoUnidades
            .Include(d => d.ConceptoMaestro)
            .Include(d => d.UnidadArancel)
            .Where(d => d.PracticaId == id)
            .OrderByDescending(d => d.Activo)
            .ThenBy(d => d.ConceptoMaestro.Nombre)
            .ToListAsync();

        return Ok(detalles.Select(MapearDetalle).ToList());
    }

    // ══════════════════════════════════════════════════════════════
    // POST /api/practicas/{id}/conceptos
    // ══════════════════════════════════════════════════════════════
    [HttpPost("{id:int}/conceptos")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaConceptoUnidadDto>> CrearConcepto(
        int id, [FromBody] CrearEditarPracticaConceptoUnidadDto dto)
    {
        var practica = await db.Practicas.FindAsync(id);
        if (practica is null)
            return NotFound(new { mensaje = $"No se encontró la práctica con ID {id}." });

        // Validar unicidad de concepto activo
        bool duplicado = await db.PracticaConceptoUnidades.AnyAsync(d =>
            d.PracticaId == id &&
            d.ConceptoMaestroId == dto.ConceptoMaestroId &&
            d.Activo);

        if (duplicado)
            return BadRequest(new { mensaje = "Ya existe un vínculo activo para ese concepto en esta práctica." });

        var nuevo = new PracticaConceptoUnidad
        {
            PracticaId        = id,
            ConceptoMaestroId = dto.ConceptoMaestroId,
            UnidadArancelId   = dto.UnidadArancelId,
            Unidades          = dto.Unidades,
            Cantidad          = dto.Cantidad,
            VigenciaDesde     = dto.VigenciaDesde,
            VigenciaHasta     = dto.VigenciaHasta,
            CreatedAt         = DateTime.UtcNow,
            UpdatedAt         = DateTime.UtcNow,
            CreatedBy         = ObtenerUsuarioId(),
            UpdatedBy         = ObtenerUsuarioId()
        };
        nuevo.Activo = DerivarActivo(nuevo.VigenciaDesde, nuevo.VigenciaHasta);

        db.PracticaConceptoUnidades.Add(nuevo);
        await db.SaveChangesAsync();

        db.PracticaAuditLogs.Add(new PracticaAuditLog
        {
            PracticaId                = id,
            PracticaConceptoUnidadId  = nuevo.Id,
            Accion                    = "ALTA",
            Entidad                   = "PRACTICA_CONCEPTO",
            FechaEvento               = DateTime.UtcNow,
            UsuarioId                 = ObtenerUsuarioId(),
            UsuarioNombre             = ObtenerUsuarioNombre(),
            Origen                    = "MANUAL",
            DatosNuevos               = JsonSerializer.Serialize(dto)
        });
        await db.SaveChangesAsync();

        await db.Entry(nuevo).Reference(d => d.ConceptoMaestro).LoadAsync();
        await db.Entry(nuevo).Reference(d => d.UnidadArancel).LoadAsync();

        return CreatedAtAction(nameof(ListarConceptos), new { id }, MapearDetalle(nuevo));
    }

    // ══════════════════════════════════════════════════════════════
    // PUT /api/practicas/{id}/conceptos/{conceptoId}
    // ══════════════════════════════════════════════════════════════
    [HttpPut("{id:int}/conceptos/{conceptoId:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaConceptoUnidadDto>> ActualizarConcepto(
        int id, int conceptoId, [FromBody] CrearEditarPracticaConceptoUnidadDto dto)
    {
        var detalle = await db.PracticaConceptoUnidades
            .Include(d => d.ConceptoMaestro)
            .Include(d => d.UnidadArancel)
            .FirstOrDefaultAsync(d => d.Id == conceptoId && d.PracticaId == id);

        if (detalle is null)
            return NotFound(new { mensaje = $"No se encontró el vínculo con ID {conceptoId}." });

        bool hayCambio = detalle.Unidades        != dto.Unidades
                      || detalle.Cantidad        != dto.Cantidad
                      || detalle.UnidadArancelId != dto.UnidadArancelId;

        if (hayCambio)
        {
            var anterior = JsonSerializer.Serialize(new { detalle.Unidades, detalle.Cantidad, detalle.UnidadArancelId });

            detalle.Unidades        = dto.Unidades;
            detalle.Cantidad        = dto.Cantidad;
            detalle.UnidadArancelId = dto.UnidadArancelId;
            detalle.UpdatedAt       = DateTime.UtcNow;
            detalle.UpdatedBy       = ObtenerUsuarioId();

            await db.SaveChangesAsync();

            db.PracticaAuditLogs.Add(new PracticaAuditLog
            {
                PracticaId               = id,
                PracticaConceptoUnidadId = detalle.Id,
                Accion                   = "MODIFICACION",
                Entidad                  = "PRACTICA_CONCEPTO",
                FechaEvento              = DateTime.UtcNow,
                UsuarioId                = ObtenerUsuarioId(),
                UsuarioNombre            = ObtenerUsuarioNombre(),
                Origen                   = "MANUAL",
                DatosAnteriores          = anterior,
                DatosNuevos              = JsonSerializer.Serialize(new { detalle.Unidades, detalle.Cantidad, detalle.UnidadArancelId })
            });
            await db.SaveChangesAsync();
        }

        await db.Entry(detalle).Reference(d => d.UnidadArancel).LoadAsync();

        return Ok(MapearDetalle(detalle));
    }

    // ══════════════════════════════════════════════════════════════
    // PATCH /api/practicas/{id}/conceptos/{conceptoId}/vigencia
    // ══════════════════════════════════════════════════════════════
    [HttpPatch("{id:int}/conceptos/{conceptoId:int}/vigencia")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaConceptoUnidadDto>> VigenciaConcepto(
        int id, int conceptoId, [FromBody] ActualizarVigenciaPracticaDto dto)
    {
        var detalle = await db.PracticaConceptoUnidades
            .Include(d => d.ConceptoMaestro)
            .Include(d => d.UnidadArancel)
            .FirstOrDefaultAsync(d => d.Id == conceptoId && d.PracticaId == id);

        if (detalle is null)
            return NotFound(new { mensaje = $"No se encontró el vínculo con ID {conceptoId}." });

        bool hayCambio = detalle.VigenciaDesde != dto.VigenciaDesde
                      || detalle.VigenciaHasta != dto.VigenciaHasta;

        if (hayCambio)
        {
            var anterior = JsonSerializer.Serialize(new { detalle.VigenciaDesde, detalle.VigenciaHasta, detalle.Activo });

            detalle.VigenciaDesde = dto.VigenciaDesde;
            detalle.VigenciaHasta = dto.VigenciaHasta;
            detalle.Activo        = DerivarActivo(detalle.VigenciaDesde, detalle.VigenciaHasta);
            detalle.UpdatedAt     = DateTime.UtcNow;
            detalle.UpdatedBy     = ObtenerUsuarioId();

            await db.SaveChangesAsync();

            db.PracticaAuditLogs.Add(new PracticaAuditLog
            {
                PracticaId               = id,
                PracticaConceptoUnidadId = detalle.Id,
                Accion                   = "CAMBIO_VIGENCIA",
                Entidad                  = "PRACTICA_CONCEPTO",
                FechaEvento              = DateTime.UtcNow,
                UsuarioId                = ObtenerUsuarioId(),
                UsuarioNombre            = ObtenerUsuarioNombre(),
                Origen                   = "MANUAL",
                DatosAnteriores          = anterior,
                DatosNuevos              = JsonSerializer.Serialize(new { detalle.VigenciaDesde, detalle.VigenciaHasta, detalle.Activo })
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDetalle(detalle));
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas/{id}/auditoria
    // ══════════════════════════════════════════════════════════════
    [HttpGet("{id:int}/auditoria")]
    public async Task<ActionResult<List<PracticaAuditLogDto>>> AuditoriaPorId(int id)
    {
        var logs = await db.PracticaAuditLogs
            .Where(l => l.PracticaId == id)
            .OrderByDescending(l => l.FechaEvento)
            .ToListAsync();

        return Ok(logs.Select(MapearLog).ToList());
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas/auditoria  (global con filtros)
    // ══════════════════════════════════════════════════════════════
    [HttpGet("auditoria")]
    public async Task<ActionResult<List<PracticaAuditLogDto>>> AuditoriaGlobal(
        [FromQuery] string? usuarioNombre,
        [FromQuery] string? accion,
        [FromQuery] string? entidad,
        [FromQuery] DateTime? fechaDesde,
        [FromQuery] DateTime? fechaHasta)
    {
        var query = db.PracticaAuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(l => EF.Functions.ILike(l.UsuarioNombre, $"%{usuarioNombre}%"));
        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);
        if (!string.IsNullOrWhiteSpace(entidad))
            query = query.Where(l => l.Entidad == entidad);
        if (fechaDesde.HasValue)
            query = query.Where(l => l.FechaEvento >= fechaDesde.Value);
        if (fechaHasta.HasValue)
            query = query.Where(l => l.FechaEvento <= fechaHasta.Value);

        var logs = await query.OrderByDescending(l => l.FechaEvento).Take(500).ToListAsync();
        return Ok(logs.Select(MapearLog).ToList());
    }

    // ══════════════════════════════════════════════════════════════
    // GET /api/practicas/exportar
    // ══════════════════════════════════════════════════════════════
    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar(
        [FromQuery] int     nomencladorId,
        [FromQuery] int?    clasificadorId,
        [FromQuery] string? estado,
        [FromQuery] string? buscar)
    {
        var query = db.Practicas
            .Include(p => p.NomencladorMaestro)
            .Include(p => p.ClasificadorPractica)
            .Include(p => p.ConceptoUnidades).ThenInclude(d => d.ConceptoMaestro)
            .Include(p => p.ConceptoUnidades).ThenInclude(d => d.UnidadArancel)
            .Where(p => p.NomencladorId == nomencladorId)
            .AsQueryable();

        if (clasificadorId.HasValue)
            query = query.Where(p => p.ClasificadorPracticaId == clasificadorId.Value);

        if (!string.IsNullOrWhiteSpace(estado))
        {
            bool activo = estado.Equals("Activo", StringComparison.OrdinalIgnoreCase);
            query = query.Where(p => p.Activo == activo);
        }

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(p =>
                EF.Functions.ILike(p.Codigo, $"%{buscar}%") ||
                EF.Functions.ILike(p.Nombre, $"%{buscar}%"));

        var practicas = await query.OrderBy(p => p.Codigo).ToListAsync();

        using var wb = new XLWorkbook();

        // Solapa 1 — Prácticas
        var ws1 = wb.Worksheets.Add("Prácticas");
        ws1.Cell(1, 1).Value = "Codigo";
        ws1.Cell(1, 2).Value = "Nombre";
        ws1.Cell(1, 3).Value = "NomencladorId";
        ws1.Cell(1, 4).Value = "NomencladorNombre";
        ws1.Cell(1, 5).Value = "ClasificadorPracticaId";
        ws1.Cell(1, 6).Value = "VigenciaDesde";
        ws1.Cell(1, 7).Value = "VigenciaHasta";
        ws1.Cell(1, 8).Value = "Estado";

        int row = 2;
        foreach (var p in practicas)
        {
            ws1.Cell(row, 1).Value = p.Codigo;
            ws1.Cell(row, 2).Value = p.Nombre;
            ws1.Cell(row, 3).Value = p.NomencladorId;
            ws1.Cell(row, 4).Value = p.NomencladorMaestro?.Nombre ?? "";
            ws1.Cell(row, 5).Value = p.ClasificadorPracticaId?.ToString() ?? "";
            ws1.Cell(row, 6).Value = p.VigenciaDesde.ToString("yyyy-MM-dd");
            ws1.Cell(row, 7).Value = p.VigenciaHasta?.ToString("yyyy-MM-dd") ?? "";
            ws1.Cell(row, 8).Value = p.Activo ? "Activo" : "Inactivo";
            row++;
        }

        // Solapa 2 — Detalle
        var ws2 = wb.Worksheets.Add("Detalle");
        ws2.Cell(1, 1).Value = "Codigo";
        ws2.Cell(1, 2).Value = "NomencladorId";
        ws2.Cell(1, 3).Value = "ConceptoMaestroId";
        ws2.Cell(1, 4).Value = "ConceptoSigla";
        ws2.Cell(1, 5).Value = "UnidadArancelId";
        ws2.Cell(1, 6).Value = "UnidadArancelNombre";
        ws2.Cell(1, 7).Value = "Unidades";
        ws2.Cell(1, 8).Value = "Cantidad";
        ws2.Cell(1, 9).Value = "VigenciaDesde";
        ws2.Cell(1, 10).Value = "VigenciaHasta";

        row = 2;
        foreach (var p in practicas)
        {
            foreach (var d in p.ConceptoUnidades)
            {
                ws2.Cell(row, 1).Value  = p.Codigo;
                ws2.Cell(row, 2).Value  = p.NomencladorId;
                ws2.Cell(row, 3).Value  = d.ConceptoMaestroId;
                ws2.Cell(row, 4).Value  = d.ConceptoMaestro?.Sigla ?? "";
                ws2.Cell(row, 5).Value  = d.UnidadArancelId;
                ws2.Cell(row, 6).Value  = d.UnidadArancel?.Nombre ?? "";
                ws2.Cell(row, 7).Value  = d.Unidades;
                ws2.Cell(row, 8).Value  = d.Cantidad;
                ws2.Cell(row, 9).Value  = d.VigenciaDesde.ToString("yyyy-MM-dd");
                ws2.Cell(row, 10).Value = d.VigenciaHasta?.ToString("yyyy-MM-dd") ?? "";
                row++;
            }
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        ms.Position = 0;

        return File(ms.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "practicas_export.xlsx");
    }

    // ══════════════════════════════════════════════════════════════
    // POST /api/practicas/importar/preview
    // ══════════════════════════════════════════════════════════════
    [HttpPost("importar/preview")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<PracticaImportPreviewDto>> ImportarPreview(IFormFile archivo)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Se requiere un archivo Excel." });

        var transactionId = Guid.NewGuid();
        var result = new PracticaImportPreviewDto { TransactionId = transactionId };

        using var stream = archivo.OpenReadStream();
        using var wb = new XLWorkbook(stream);

        // ── Solapa Prácticas ──────────────────────────────────────
        if (!wb.TryGetWorksheet("Prácticas", out var ws1) && !wb.TryGetWorksheet("Practicas", out ws1))
        {
            result.Errores.Add("No se encontró la solapa 'Prácticas'.");
            return Ok(result);
        }

        var nomencladoresIds   = db.NomencladorMaestro.Select(n => n.Id).ToHashSet();
        var clasificadorIds    = db.ClasificadoresPractica.Select(c => c.Id).ToHashSet();

        int lastRow1 = ws1!.LastRowUsed()?.RowNumber() ?? 1;
        for (int r = 2; r <= lastRow1; r++)
        {
            var codigo       = ws1.Cell(r, 1).GetString().Trim();
            var nombre       = ws1.Cell(r, 2).GetString().Trim();
            var nomIdStr     = ws1.Cell(r, 3).GetString().Trim();
            var clasIdStr    = ws1.Cell(r, 5).GetString().Trim();
            var vigDesdeStr  = ws1.Cell(r, 6).GetString().Trim();

            if (string.IsNullOrEmpty(codigo) && string.IsNullOrEmpty(nombre)) continue;

            var row = new PreviewPracticaRowDto
            {
                Codigo       = codigo,
                Nombre       = nombre,
                VigenciaDesde = vigDesdeStr
            };

            if (!int.TryParse(nomIdStr, out var nomId))
            { row.Error = "NomencladorId inválido."; result.FilasPracticas.Add(row); continue; }

            if (!nomencladoresIds.Contains(nomId))
            { row.Error = $"NomencladorId {nomId} no existe."; result.FilasPracticas.Add(row); continue; }

            row.NomencladorId = nomId;

            if (!string.IsNullOrEmpty(clasIdStr) && int.TryParse(clasIdStr, out var clasId))
            {
                if (!clasificadorIds.Contains(clasId))
                { row.Error = $"ClasificadorPracticaId {clasId} no existe."; result.FilasPracticas.Add(row); continue; }
                row.ClasificadorPracticaId = clasId;
            }

            // Verificar existencia
            var existente = await db.Practicas.FirstOrDefaultAsync(p =>
                p.NomencladorId == nomId && p.Codigo == codigo);

            row.IdExistente  = existente?.Id;
            row.EsNueva      = existente is null;
            row.HayDiferencia = existente != null &&
                (existente.Nombre != nombre || existente.ClasificadorPracticaId != row.ClasificadorPracticaId);

            result.FilasPracticas.Add(row);
        }

        // ── Solapa Detalle ────────────────────────────────────────
        if (wb.TryGetWorksheet("Detalle", out var ws2))
        {
            var conceptoIds    = db.ConceptoMaestro.Select(c => c.Id).ToHashSet();
            var unidadIds      = db.UnidadesArancel.Select(u => u.Id).ToHashSet();

            int lastRow2 = ws2!.LastRowUsed()?.RowNumber() ?? 1;
            for (int r = 2; r <= lastRow2; r++)
            {
                var codigo      = ws2.Cell(r, 1).GetString().Trim();
                var nomIdStr    = ws2.Cell(r, 2).GetString().Trim();
                var concIdStr   = ws2.Cell(r, 3).GetString().Trim();
                var uaIdStr     = ws2.Cell(r, 5).GetString().Trim();
                var unidades    = ws2.Cell(r, 7).GetDouble();
                var cantidad    = ws2.Cell(r, 8).GetDouble();
                var vigDesde    = ws2.Cell(r, 9).GetString().Trim();

                if (string.IsNullOrEmpty(codigo)) continue;

                var row = new PreviewDetalleRowDto
                {
                    Codigo       = codigo,
                    Unidades     = (decimal)unidades,
                    Cantidad     = (decimal)cantidad,
                    VigenciaDesde = vigDesde
                };

                if (!int.TryParse(nomIdStr, out var nomId2))
                { row.Error = "NomencladorId inválido."; result.FilasDetalle.Add(row); continue; }

                if (!int.TryParse(concIdStr, out var concId) || !conceptoIds.Contains(concId))
                { row.Error = $"ConceptoMaestroId {concIdStr} no existe."; result.FilasDetalle.Add(row); continue; }

                if (!int.TryParse(uaIdStr, out var uaId) || !unidadIds.Contains(uaId))
                { row.Error = $"UnidadArancelId {uaIdStr} no existe."; result.FilasDetalle.Add(row); continue; }

                row.NomencladorId     = nomId2;
                row.ConceptoMaestroId = concId;
                row.UnidadArancelId   = uaId;
                result.FilasDetalle.Add(row);
            }
        }

        return Ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    // POST /api/practicas/importar/confirmar
    // ══════════════════════════════════════════════════════════════
    [HttpPost("importar/confirmar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<IActionResult> ImportarConfirmar([FromBody] ConfirmarImportacionPracticaDto dto)
    {
        // Rechazar si hay errores en el preview
        if (dto.FilasPracticas.Any(f => f.Error != null) || dto.FilasDetalle.Any(f => f.Error != null))
            return BadRequest(new { mensaje = "El preview contiene errores de integridad. Corrija el archivo antes de confirmar." });

        var uid    = ObtenerUsuarioId();
        var uNombre= ObtenerUsuarioNombre();
        var txId   = dto.TransactionId;

        foreach (var fila in dto.FilasPracticas.Where(f => f.Error is null))
        {
            DateTime vigDesde = DateTime.TryParse(fila.VigenciaDesde, out var vd) ? vd.ToUniversalTime() : DateTime.UtcNow;

            if (fila.EsNueva)
            {
                var nueva = new Practica
                {
                    Codigo                 = fila.Codigo,
                    Nombre                 = fila.Nombre,
                    NomencladorId          = fila.NomencladorId,
                    ClasificadorPracticaId = fila.ClasificadorPracticaId,
                    VigenciaDesde          = vigDesde,
                    VigenciaHasta          = null,
                    CreatedAt              = DateTime.UtcNow,
                    UpdatedAt              = DateTime.UtcNow,
                    CreatedBy              = uid,
                    UpdatedBy              = uid
                };
                nueva.Activo = DerivarActivo(nueva.VigenciaDesde, nueva.VigenciaHasta);
                db.Practicas.Add(nueva);
                await db.SaveChangesAsync();

                db.PracticaAuditLogs.Add(new PracticaAuditLog
                {
                    PracticaId    = nueva.Id,
                    Accion        = "ALTA",
                    Entidad       = "PRACTICA",
                    FechaEvento   = DateTime.UtcNow,
                    UsuarioId     = uid,
                    UsuarioNombre = uNombre,
                    Origen        = "IMPORTACION",
                    TransactionId = txId,
                    DatosNuevos   = JsonSerializer.Serialize(fila)
                });
            }
            else if (fila.HayDiferencia && fila.IdExistente.HasValue)
            {
                var p = await db.Practicas.FindAsync(fila.IdExistente.Value);
                if (p != null)
                {
                    var anterior = JsonSerializer.Serialize(new { p.Nombre, p.ClasificadorPracticaId });
                    p.Nombre                 = fila.Nombre;
                    p.ClasificadorPracticaId = fila.ClasificadorPracticaId;
                    p.UpdatedAt              = DateTime.UtcNow;
                    p.UpdatedBy              = uid;

                    db.PracticaAuditLogs.Add(new PracticaAuditLog
                    {
                        PracticaId      = p.Id,
                        Accion          = "IMPORTACION",
                        Entidad         = "PRACTICA",
                        FechaEvento     = DateTime.UtcNow,
                        UsuarioId       = uid,
                        UsuarioNombre   = uNombre,
                        Origen          = "IMPORTACION",
                        TransactionId   = txId,
                        DatosAnteriores = anterior,
                        DatosNuevos     = JsonSerializer.Serialize(fila)
                    });
                }
            }
        }

        await db.SaveChangesAsync();
        return Ok(new { mensaje = "Importación confirmada correctamente.", transactionId = dto.TransactionId });
    }

    // ══════════════════════════════════════════════════════════════
    // PRIVADOS
    // ══════════════════════════════════════════════════════════════

    private async Task<ObjectResult?> ValidarDto(CrearEditarPracticaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Codigo))
            return BadRequest(new { mensaje = "El campo Codigo es obligatorio." });
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return BadRequest(new { mensaje = "El campo Nombre es obligatorio." });

        var nomencladorExiste = await db.NomencladorMaestro.AnyAsync(n => n.Id == dto.NomencladorId);
        if (!nomencladorExiste)
            return BadRequest(new { mensaje = $"No existe el Nomenclador con ID {dto.NomencladorId}." });

        if (dto.ClasificadorPracticaId.HasValue)
        {
            var clasExiste = await db.ClasificadoresPractica.AnyAsync(c => c.Id == dto.ClasificadorPracticaId.Value);
            if (!clasExiste)
                return BadRequest(new { mensaje = $"No existe el Clasificador con ID {dto.ClasificadorPracticaId}." });
        }

        return null;
    }

    private async Task ValidarUnicidad(int nomencladorId, string codigo, int? idExcluir)
    {
        var existe = await db.Practicas.AnyAsync(p =>
            p.NomencladorId == nomencladorId &&
            p.Codigo == codigo.Trim() &&
            (idExcluir == null || p.Id != idExcluir.Value));

        if (existe)
            throw new InvalidOperationException(
                $"Ya existe una práctica con código '{codigo}' en el nomenclador {nomencladorId}.");
    }

    private static PracticaAuditLogDto MapearLog(PracticaAuditLog l) => new()
    {
        Id                       = l.Id,
        PracticaId               = l.PracticaId,
        PracticaConceptoUnidadId = l.PracticaConceptoUnidadId,
        Accion                   = l.Accion,
        Entidad                  = l.Entidad,
        FechaEvento              = l.FechaEvento.ToString("o"),
        UsuarioId                = l.UsuarioId,
        UsuarioNombre            = l.UsuarioNombre,
        Origen                   = l.Origen,
        TransactionId            = l.TransactionId?.ToString(),
        DatosAnteriores          = l.DatosAnteriores is not null
            ? JsonSerializer.Deserialize<JsonElement>(l.DatosAnteriores) : null,
        DatosNuevos              = l.DatosNuevos is not null
            ? JsonSerializer.Deserialize<JsonElement>(l.DatosNuevos) : null
    };
}
