// ============================================================
// CONTROLLER: ConceptoMaestro
// Gestión completa del módulo de Conceptos.
// Endpoints:
//   GET    /api/concepto                    - Lista con filtros
//   GET    /api/concepto/{id}               - Detalle
//   POST   /api/concepto                    - Alta
//   PUT    /api/concepto/{id}               - Edición completa
//   PATCH  /api/concepto/{id}/vigencia      - Actualizar vigencia
//   PATCH  /api/concepto/{id}/estado        - Activar/inactivar
//   GET    /api/concepto/{id}/auditoria     - Historial de un concepto
//   GET    /api/concepto/auditoria          - Auditoría global con filtros
//   GET    /api/concepto/exportar           - Descarga Excel
//   POST   /api/concepto/importar/preview   - Previsualiza importación
//   POST   /api/concepto/importar/confirmar - Confirma importación
// ============================================================

using System.Security.Claims;
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
[Route("api/concepto")]
[Authorize]
public class ConceptoController(ApplicationDbContext db) : ControllerBase
{
    // ── Helpers de usuario autenticado ───────────────────────────
    private long? UsuarioId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string UsuarioNombre =>
        $"{User.FindFirstValue("nombre") ?? ""} {User.FindFirstValue("apellido") ?? ""}".Trim();

    // ── GET /api/concepto ────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<ConceptoMaestroListDto>>> ObtenerTodos(
        [FromQuery] string? buscar,
        [FromQuery] string? estado)
    {
        var query = db.ConceptoMaestro.AsQueryable();

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(c =>
                c.Nombre.ToLower().Contains(buscar.ToLower()) ||
                c.Sigla.ToLower().Contains(buscar.ToLower()));

        var lista = await query
            .OrderBy(c => c.Nombre)
            .Select(c => new ConceptoMaestroListDto
            {
                Id            = c.Id,
                Nombre        = c.Nombre,
                Sigla         = c.Sigla,
                VigenciaDesde = c.VigenciaDesde.ToString("yyyy-MM-dd"),
                VigenciaHasta = c.VigenciaHasta.ToString("yyyy-MM-dd"),
                Activo        = c.Activo,
                Estado        = c.Activo ? "Vigente" : "Inactivo",
                CreatedAt     = c.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                UpdatedAt     = c.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(estado))
            lista = lista.Where(c => c.Estado == estado).ToList();

        return Ok(lista);
    }

    // ── GET /api/concepto/{id} ───────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConceptoMaestroDto>> ObtenerPorId(int id)
    {
        var c = await db.ConceptoMaestro.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el concepto con ID {id}." });
        return Ok(MapearDto(c));
    }

    // ── POST /api/concepto ───────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoMaestroDto>> Crear([FromBody] CrearEditarConceptoMaestroDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        if (await db.ConceptoMaestro.AnyAsync(c => c.Nombre.ToLower() == dto.Nombre.ToLower()))
            return BadRequest(new { mensaje = $"Ya existe un concepto con el nombre '{dto.Nombre}'." });

        if (await db.ConceptoMaestro.AnyAsync(c => c.Sigla.ToLower() == dto.Sigla.ToLower()))
            return BadRequest(new { mensaje = $"Ya existe un concepto con la sigla '{dto.Sigla}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        var nuevo = new ConceptoMaestro
        {
            Nombre        = dto.Nombre.Trim(),
            Sigla         = dto.Sigla.Trim().ToUpper(),
            VigenciaDesde = desde,
            VigenciaHasta = hasta,
            Activo        = DerivarActivo(hasta),
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
            CreatedBy     = UsuarioId,
            UpdatedBy     = UsuarioId,
        };

        db.ConceptoMaestro.Add(nuevo);
        await db.SaveChangesAsync();

        db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
        {
            ConceptoMaestroId = nuevo.Id,
            Accion            = "ALTA",
            FechaEvento       = DateTime.UtcNow,
            UsuarioId         = UsuarioId,
            UsuarioNombre     = UsuarioNombre,
            Origen            = "MANUAL",
            NombreNuevo       = nuevo.Nombre,
            SiglaNueva        = nuevo.Sigla,
            VigenciaDesdeNuevo = nuevo.VigenciaDesde,
            VigenciaHastaNuevo = nuevo.VigenciaHasta,
            ActivoNuevo       = nuevo.Activo,
            DatosNuevos       = JsonSerializer.Serialize(MapearDto(nuevo)),
        });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, MapearDto(nuevo));
    }

    // ── PUT /api/concepto/{id} ───────────────────────────────────
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoMaestroDto>> Actualizar(int id, [FromBody] CrearEditarConceptoMaestroDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        var c = await db.ConceptoMaestro.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el concepto con ID {id}." });

        if (await db.ConceptoMaestro.AnyAsync(x => x.Nombre.ToLower() == dto.Nombre.ToLower() && x.Id != id))
            return BadRequest(new { mensaje = $"Ya existe otro concepto con el nombre '{dto.Nombre}'." });

        if (await db.ConceptoMaestro.AnyAsync(x => x.Sigla.ToLower() == dto.Sigla.ToLower() && x.Id != id))
            return BadRequest(new { mensaje = $"Ya existe otro concepto con la sigla '{dto.Sigla}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        bool cambioNombre  = c.Nombre        != dto.Nombre.Trim();
        bool cambioSigla   = c.Sigla         != dto.Sigla.Trim().ToUpper();
        bool cambioDesde   = c.VigenciaDesde != desde;
        bool cambioHasta   = c.VigenciaHasta != hasta;
        bool huboCambios   = cambioNombre || cambioSigla || cambioDesde || cambioHasta;

        var antNombre = c.Nombre;
        var antSigla  = c.Sigla;
        var antDesde  = c.VigenciaDesde;
        var antHasta  = c.VigenciaHasta;
        var antActivo = c.Activo;

        c.Nombre        = dto.Nombre.Trim();
        c.Sigla         = dto.Sigla.Trim().ToUpper();
        c.VigenciaDesde = desde;
        c.VigenciaHasta = hasta;
        c.Activo        = DerivarActivo(hasta);
        c.UpdatedAt     = DateTime.UtcNow;
        c.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        if (huboCambios)
        {
            db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
            {
                ConceptoMaestroId     = c.Id,
                Accion                = "MODIFICACION",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = antNombre,
                SiglaAnterior         = antSigla,
                VigenciaDesdeAnterior = antDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = c.Nombre,
                SiglaNueva            = c.Sigla,
                VigenciaDesdeNuevo    = c.VigenciaDesde,
                VigenciaHastaNuevo    = c.VigenciaHasta,
                ActivoNuevo           = c.Activo,
                DatosAnteriores       = JsonSerializer.Serialize(new { Nombre = antNombre, Sigla = antSigla, VigenciaDesde = antDesde.ToString("yyyy-MM-dd"), VigenciaHasta = antHasta.ToString("yyyy-MM-dd"), Activo = antActivo }),
                DatosNuevos           = JsonSerializer.Serialize(MapearDto(c)),
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(c));
    }

    // ── PATCH /api/concepto/{id}/vigencia ────────────────────────
    [HttpPatch("{id:int}/vigencia")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoMaestroDto>> ActualizarVigencia(int id, [FromBody] ActualizarVigenciaConceptoDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VigenciaDesde) || string.IsNullOrWhiteSpace(dto.VigenciaHasta))
            return BadRequest(new { mensaje = "vigenciaDesde y vigenciaHasta son obligatorias." });

        if (!DateOnly.TryParse(dto.VigenciaDesde, out var desde) ||
            !DateOnly.TryParse(dto.VigenciaHasta, out var hasta))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Use yyyy-MM-dd." });

        if (hasta < desde)
            return BadRequest(new { mensaje = "vigenciaHasta debe ser mayor o igual a vigenciaDesde." });

        var c = await db.ConceptoMaestro.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el concepto con ID {id}." });

        var antDesde  = c.VigenciaDesde;
        var antHasta  = c.VigenciaHasta;
        var antActivo = c.Activo;

        c.VigenciaDesde = desde;
        c.VigenciaHasta = hasta;
        c.Activo        = DerivarActivo(hasta);
        c.UpdatedAt     = DateTime.UtcNow;
        c.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
        {
            ConceptoMaestroId     = c.Id,
            Accion                = "CAMBIO_VIGENCIA",
            FechaEvento           = DateTime.UtcNow,
            UsuarioId             = UsuarioId,
            UsuarioNombre         = UsuarioNombre,
            Origen                = "MANUAL",
            NombreAnterior        = c.Nombre,
            SiglaAnterior         = c.Sigla,
            VigenciaDesdeAnterior = antDesde,
            VigenciaHastaAnterior = antHasta,
            ActivoAnterior        = antActivo,
            NombreNuevo           = c.Nombre,
            SiglaNueva            = c.Sigla,
            VigenciaDesdeNuevo    = c.VigenciaDesde,
            VigenciaHastaNuevo    = c.VigenciaHasta,
            ActivoNuevo           = c.Activo,
        });
        await db.SaveChangesAsync();

        return Ok(MapearDto(c));
    }

    // ── PATCH /api/concepto/{id}/estado ─────────────────────────
    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoMaestroDto>> ActualizarEstado(int id, [FromBody] ActualizarEstadoConceptoDto dto)
    {
        var c = await db.ConceptoMaestro.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el concepto con ID {id}." });

        var antHasta  = c.VigenciaHasta;
        var antActivo = c.Activo;

        var nuevaHasta = dto.Activo
            ? new DateOnly(9999, 12, 31)
            : DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        c.VigenciaHasta = nuevaHasta;
        c.Activo        = dto.Activo;
        c.UpdatedAt     = DateTime.UtcNow;
        c.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        if (antHasta != nuevaHasta)
        {
            db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
            {
                ConceptoMaestroId     = c.Id,
                Accion                = "CAMBIO_VIGENCIA",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = c.Nombre,
                SiglaAnterior         = c.Sigla,
                VigenciaDesdeAnterior = c.VigenciaDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = c.Nombre,
                SiglaNueva            = c.Sigla,
                VigenciaDesdeNuevo    = c.VigenciaDesde,
                VigenciaHastaNuevo    = c.VigenciaHasta,
                ActivoNuevo           = c.Activo,
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(c));
    }

    // ── GET /api/concepto/{id}/auditoria ─────────────────────────
    [HttpGet("{id:int}/auditoria")]
    public async Task<ActionResult<List<ConceptoMaestroAuditLogDto>>> ObtenerAuditoriaPorId(int id)
    {
        var existe = await db.ConceptoMaestro.AnyAsync(c => c.Id == id);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró el concepto con ID {id}." });

        var logs = await db.ConceptoMaestroAuditLog
            .Include(l => l.ConceptoMaestro)
            .Where(l => l.ConceptoMaestroId == id)
            .OrderByDescending(l => l.FechaEvento)
            .Select(l => MapearLogDto(l))
            .ToListAsync();

        return Ok(logs);
    }

    // ── GET /api/concepto/auditoria ──────────────────────────────
    [HttpGet("auditoria")]
    public async Task<ActionResult<List<ConceptoMaestroAuditLogDto>>> ObtenerAuditoriaGlobal(
        [FromQuery] string? usuarioNombre,
        [FromQuery] string? fechaDesde,
        [FromQuery] string? fechaHasta,
        [FromQuery] string? accion,
        [FromQuery] int?    conceptoId)
    {
        var query = db.ConceptoMaestroAuditLog
            .Include(l => l.ConceptoMaestro)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(l => l.UsuarioNombre.ToLower().Contains(usuarioNombre.ToLower()));

        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);

        if (conceptoId.HasValue)
            query = query.Where(l => l.ConceptoMaestroId == conceptoId.Value);

        if (!string.IsNullOrWhiteSpace(fechaDesde) && DateTime.TryParse(fechaDesde, out var fd))
            query = query.Where(l => l.FechaEvento >= fd.ToUniversalTime());

        if (!string.IsNullOrWhiteSpace(fechaHasta) && DateTime.TryParse(fechaHasta, out var fh))
            query = query.Where(l => l.FechaEvento <= fh.ToUniversalTime().AddDays(1));

        var logs = await query
            .OrderByDescending(l => l.FechaEvento)
            .Take(500)
            .Select(l => MapearLogDto(l))
            .ToListAsync();

        return Ok(logs);
    }

    // ── GET /api/concepto/exportar ───────────────────────────────
    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar()
    {
        var conceptos = await db.ConceptoMaestro
            .OrderBy(c => c.Nombre)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Conceptos");

        ws.Cell(1, 1).Value = "ID";
        ws.Cell(1, 2).Value = "Nombre";
        ws.Cell(1, 3).Value = "Sigla";
        ws.Cell(1, 4).Value = "Vigencia Desde";
        ws.Cell(1, 5).Value = "Vigencia Hasta";
        ws.Cell(1, 6).Value = "Activo";

        var header = ws.Range("A1:F1");
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
        header.Style.Font.FontColor = XLColor.White;

        for (int i = 0; i < conceptos.Count; i++)
        {
            var c = conceptos[i];
            ws.Cell(i + 2, 1).Value = c.Id;
            ws.Cell(i + 2, 2).Value = c.Nombre;
            ws.Cell(i + 2, 3).Value = c.Sigla;
            ws.Cell(i + 2, 4).Value = c.VigenciaDesde.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 5).Value = c.VigenciaHasta.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 6).Value = c.Activo ? "SI" : "NO";
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"conceptos-{DateTime.UtcNow:yyyyMMdd}.xlsx"
        );
    }

    // ── POST /api/concepto/importar/preview ──────────────────────
    [HttpPost("importar/preview")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ConceptoMaestroImportPreviewDto>> ImportarPreview(IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Debe adjuntar un archivo Excel." });

        var filas = LeerExcel(archivo);
        if (filas.Count == 0)
            return BadRequest(new { mensaje = "El archivo no contiene filas de datos." });

        var nombres = filas.Select(f => f.Nombre.Trim().ToLower()).ToList();
        var existentes = await db.ConceptoMaestro
            .Where(c => nombres.Contains(c.Nombre.ToLower()))
            .ToListAsync();

        var transactionId = Guid.NewGuid();
        var preview = new ConceptoMaestroImportPreviewDto
        {
            TransactionId = transactionId,
            Filas = filas.Select(f =>
            {
                var ex = existentes.FirstOrDefault(e => e.Nombre.ToLower() == f.Nombre.Trim().ToLower());
                return new ConceptoMaestroImportPreviewRowDto
                {
                    NombreImport        = f.Nombre.Trim(),
                    SiglaImport         = f.Sigla.Trim().ToUpper(),
                    VigenciaDesdeImport = f.VigenciaDesde,
                    VigenciaHastaImport = f.VigenciaHasta,
                    IdExistente          = ex?.Id,
                    NombreActual         = ex?.Nombre,
                    SiglaActual          = ex?.Sigla,
                    VigenciaDesdeActual  = ex?.VigenciaDesde.ToString("yyyy-MM-dd"),
                    VigenciaHastaActual  = ex?.VigenciaHasta.ToString("yyyy-MM-dd"),
                    ActivoActual         = ex?.Activo,
                    HayDiferenciaNombre   = ex != null && ex.Nombre != f.Nombre.Trim(),
                    HayDiferenciaSigla    = ex != null && ex.Sigla != f.Sigla.Trim().ToUpper(),
                    HayDiferenciaVigencia = ex != null &&
                        (ex.VigenciaDesde.ToString("yyyy-MM-dd") != f.VigenciaDesde ||
                         ex.VigenciaHasta.ToString("yyyy-MM-dd") != f.VigenciaHasta),
                    EsNuevo = ex == null,
                };
            }).ToList()
        };

        return Ok(preview);
    }

    // ── POST /api/concepto/importar/confirmar ────────────────────
    [HttpPost("importar/confirmar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult> ImportarConfirmar([FromBody] ConfirmarImportacionConceptoDto dto)
    {
        if (dto.Filas == null || dto.Filas.Count == 0)
            return BadRequest(new { mensaje = "No hay filas para importar." });

        var ahora = DateTime.UtcNow;
        int creados = 0, actualizados = 0;

        foreach (var fila in dto.Filas)
        {
            if (string.IsNullOrWhiteSpace(fila.Nombre)) continue;
            if (ValidarFilaImport(fila) != null) continue;

            var desde = DateOnly.Parse(fila.VigenciaDesde);
            var hasta = DateOnly.Parse(fila.VigenciaHasta);

            var existente = await db.ConceptoMaestro
                .FirstOrDefaultAsync(c => c.Nombre.ToLower() == fila.Nombre.Trim().ToLower());

            if (existente == null)
            {
                var nuevo = new ConceptoMaestro
                {
                    Nombre        = fila.Nombre.Trim(),
                    Sigla         = fila.Sigla.Trim().ToUpper(),
                    VigenciaDesde = desde,
                    VigenciaHasta = hasta,
                    Activo        = DerivarActivo(hasta),
                    CreatedAt     = ahora,
                    UpdatedAt     = ahora,
                    CreatedBy     = UsuarioId,
                    UpdatedBy     = UsuarioId,
                };
                db.ConceptoMaestro.Add(nuevo);
                await db.SaveChangesAsync();

                db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
                {
                    ConceptoMaestroId  = nuevo.Id,
                    Accion             = "ALTA",
                    FechaEvento        = ahora,
                    UsuarioId          = UsuarioId,
                    UsuarioNombre      = UsuarioNombre,
                    Origen             = "IMPORTACION",
                    TransactionId      = dto.TransactionId,
                    NombreNuevo        = nuevo.Nombre,
                    SiglaNueva         = nuevo.Sigla,
                    VigenciaDesdeNuevo = nuevo.VigenciaDesde,
                    VigenciaHastaNuevo = nuevo.VigenciaHasta,
                    ActivoNuevo        = nuevo.Activo,
                    DatosNuevos        = JsonSerializer.Serialize(fila),
                });
                creados++;
            }
            else
            {
                var antNombre = existente.Nombre;
                var antSigla  = existente.Sigla;
                var antDesde  = existente.VigenciaDesde;
                var antHasta  = existente.VigenciaHasta;
                var antActivo = existente.Activo;

                existente.Nombre        = fila.Nombre.Trim();
                existente.Sigla         = fila.Sigla.Trim().ToUpper();
                existente.VigenciaDesde = desde;
                existente.VigenciaHasta = hasta;
                existente.Activo        = DerivarActivo(hasta);
                existente.UpdatedAt     = ahora;
                existente.UpdatedBy     = UsuarioId;

                await db.SaveChangesAsync();

                db.ConceptoMaestroAuditLog.Add(new ConceptoMaestroAuditLog
                {
                    ConceptoMaestroId     = existente.Id,
                    Accion                = "IMPORTACION",
                    FechaEvento           = ahora,
                    UsuarioId             = UsuarioId,
                    UsuarioNombre         = UsuarioNombre,
                    Origen                = "IMPORTACION",
                    TransactionId         = dto.TransactionId,
                    NombreAnterior        = antNombre,
                    SiglaAnterior         = antSigla,
                    VigenciaDesdeAnterior = antDesde,
                    VigenciaHastaAnterior = antHasta,
                    ActivoAnterior        = antActivo,
                    NombreNuevo           = existente.Nombre,
                    SiglaNueva            = existente.Sigla,
                    VigenciaDesdeNuevo    = existente.VigenciaDesde,
                    VigenciaHastaNuevo    = existente.VigenciaHasta,
                    ActivoNuevo           = existente.Activo,
                    DatosAnteriores       = JsonSerializer.Serialize(new { antNombre, antSigla, antDesde, antHasta, antActivo }),
                    DatosNuevos           = JsonSerializer.Serialize(fila),
                });
                actualizados++;
            }
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            mensaje       = $"Importación completada. Creados: {creados}, Actualizados: {actualizados}.",
            transactionId = dto.TransactionId,
            creados,
            actualizados
        });
    }

    // ── Helpers privados ─────────────────────────────────────────

    private static bool DerivarActivo(DateOnly vigenciaHasta) =>
        vigenciaHasta >= DateOnly.FromDateTime(DateTime.UtcNow.Date);

    private static string? ValidarDto(CrearEditarConceptoMaestroDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return "El nombre del concepto es obligatorio.";
        if (dto.Nombre.Length > 150)
            return "El nombre no puede superar 150 caracteres.";
        if (string.IsNullOrWhiteSpace(dto.Sigla))
            return "La sigla del concepto es obligatoria.";
        if (dto.Sigla.Length > 10)
            return "La sigla no puede superar 10 caracteres.";
        if (string.IsNullOrWhiteSpace(dto.VigenciaDesde))
            return "vigenciaDesde es obligatoria.";
        if (string.IsNullOrWhiteSpace(dto.VigenciaHasta))
            return "vigenciaHasta es obligatoria.";
        if (!DateOnly.TryParse(dto.VigenciaDesde, out var desde))
            return "Formato de vigenciaDesde inválido. Use yyyy-MM-dd.";
        if (!DateOnly.TryParse(dto.VigenciaHasta, out var hasta))
            return "Formato de vigenciaHasta inválido. Use yyyy-MM-dd.";
        if (hasta < desde)
            return "vigenciaHasta debe ser mayor o igual a vigenciaDesde.";
        return null;
    }

    private static string? ValidarFilaImport(ConceptoMaestroImportRowDto fila)
    {
        if (string.IsNullOrWhiteSpace(fila.Sigla))
            return "sigla obligatoria";
        if (string.IsNullOrWhiteSpace(fila.VigenciaDesde) || string.IsNullOrWhiteSpace(fila.VigenciaHasta))
            return "vigencias obligatorias";
        if (!DateOnly.TryParse(fila.VigenciaDesde, out var d) || !DateOnly.TryParse(fila.VigenciaHasta, out var h))
            return "formato de fecha inválido";
        if (h < d) return "vigenciaHasta < vigenciaDesde";
        return null;
    }

    private static List<ConceptoMaestroImportRowDto> LeerExcel(IFormFile archivo)
    {
        var filas = new List<ConceptoMaestroImportRowDto>();
        using var stream = archivo.OpenReadStream();
        using var wb     = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        for (int r = 2; r <= lastRow; r++)
        {
            var nombre = ws.Cell(r, 2).GetString().Trim();
            if (string.IsNullOrWhiteSpace(nombre)) continue;

            filas.Add(new ConceptoMaestroImportRowDto
            {
                Nombre        = nombre,
                Sigla         = ws.Cell(r, 3).GetString().Trim(),
                VigenciaDesde = ws.Cell(r, 4).GetString().Trim(),
                VigenciaHasta = ws.Cell(r, 5).GetString().Trim(),
            });
        }
        return filas;
    }

    private static ConceptoMaestroDto MapearDto(ConceptoMaestro c) => new()
    {
        Id            = c.Id,
        Nombre        = c.Nombre,
        Sigla         = c.Sigla,
        VigenciaDesde = c.VigenciaDesde.ToString("yyyy-MM-dd"),
        VigenciaHasta = c.VigenciaHasta.ToString("yyyy-MM-dd"),
        Activo        = c.Activo,
        Estado        = c.Activo ? "Vigente" : "Inactivo",
        CreatedAt     = c.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UpdatedAt     = c.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        CreatedBy     = c.CreatedBy,
        UpdatedBy     = c.UpdatedBy,
    };

    private static ConceptoMaestroAuditLogDto MapearLogDto(ConceptoMaestroAuditLog l) => new()
    {
        Id                 = l.Id,
        ConceptoMaestroId  = l.ConceptoMaestroId,
        NombreConcepto     = l.ConceptoMaestro?.Nombre ?? string.Empty,
        Accion             = l.Accion,
        FechaEvento        = l.FechaEvento.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UsuarioId          = l.UsuarioId,
        UsuarioNombre      = l.UsuarioNombre,
        Origen             = l.Origen,
        TransactionId      = l.TransactionId,
        NombreAnterior          = l.NombreAnterior,
        SiglaAnterior           = l.SiglaAnterior,
        VigenciaDesdeAnterior   = l.VigenciaDesdeAnterior?.ToString("yyyy-MM-dd"),
        VigenciaHastaAnterior   = l.VigenciaHastaAnterior?.ToString("yyyy-MM-dd"),
        ActivoAnterior          = l.ActivoAnterior,
        NombreNuevo             = l.NombreNuevo,
        SiglaNueva              = l.SiglaNueva,
        VigenciaDesdeNuevo      = l.VigenciaDesdeNuevo?.ToString("yyyy-MM-dd"),
        VigenciaHastaNuevo      = l.VigenciaHastaNuevo?.ToString("yyyy-MM-dd"),
        ActivoNuevo             = l.ActivoNuevo,
        DatosAnteriores         = l.DatosAnteriores,
        DatosNuevos             = l.DatosNuevos,
    };
}
