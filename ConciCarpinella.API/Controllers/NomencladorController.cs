// ============================================================
// CONTROLLER: NomencladorMaestro
// Gestión completa del módulo de Nomencladores.
// Endpoints:
//   GET    /api/nomenclador                    - Lista con filtros
//   GET    /api/nomenclador/{id}               - Detalle
//   POST   /api/nomenclador                    - Alta
//   PUT    /api/nomenclador/{id}               - Edición completa
//   PATCH  /api/nomenclador/{id}/vigencia      - Actualizar vigencia
//   PATCH  /api/nomenclador/{id}/estado        - Activar/inactivar
//   GET    /api/nomenclador/{id}/auditoria     - Historial de un nomenclador
//   GET    /api/nomenclador/auditoria          - Auditoría global con filtros
//   GET    /api/nomenclador/exportar           - Descarga Excel
//   POST   /api/nomenclador/importar/preview   - Previsualiza importación
//   POST   /api/nomenclador/importar/confirmar - Confirma importación
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
[Route("api/nomenclador")]
[Authorize]
public class NomencladorController(ApplicationDbContext db) : ControllerBase
{
    // ── Helpers de usuario autenticado ───────────────────────────
    private long? UsuarioId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string UsuarioNombre =>
        $"{User.FindFirstValue("nombre") ?? ""} {User.FindFirstValue("apellido") ?? ""}".Trim();

    // ── GET /api/nomenclador ─────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<NomencladorMaestroListDto>>> ObtenerTodos(
        [FromQuery] string? buscar,
        [FromQuery] string? estado)
    {
        var query = db.NomencladorMaestro.AsQueryable();

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(n => n.Nombre.ToLower().Contains(buscar.ToLower()));

        var lista = await query
            .OrderBy(n => n.Nombre)
            .Select(n => new NomencladorMaestroListDto
            {
                Id            = n.Id,
                Nombre        = n.Nombre,
                VigenciaDesde = n.VigenciaDesde.ToString("yyyy-MM-dd"),
                VigenciaHasta = n.VigenciaHasta.ToString("yyyy-MM-dd"),
                Activo        = n.Activo,
                Estado        = n.Activo ? "Vigente" : "Inactivo",
                CreatedAt     = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                UpdatedAt     = n.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            })
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(estado))
            lista = lista.Where(n => n.Estado == estado).ToList();

        return Ok(lista);
    }

    // ── GET /api/nomenclador/{id} ────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<ActionResult<NomencladorMaestroDto>> ObtenerPorId(int id)
    {
        var n = await db.NomencladorMaestro.FindAsync(id);
        if (n is null)
            return NotFound(new { mensaje = $"No se encontró el nomenclador con ID {id}." });
        return Ok(MapearDto(n));
    }

    // ── POST /api/nomenclador ────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<NomencladorMaestroDto>> Crear([FromBody] CrearEditarNomencladorMaestroDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        if (await db.NomencladorMaestro.AnyAsync(n => n.Nombre.ToLower() == dto.Nombre.ToLower()))
            return BadRequest(new { mensaje = $"Ya existe un nomenclador con el nombre '{dto.Nombre}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        var nuevo = new NomencladorMaestro
        {
            Nombre        = dto.Nombre.Trim(),
            VigenciaDesde = desde,
            VigenciaHasta = hasta,
            Activo        = DerivarActivo(hasta),
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
            CreatedBy     = UsuarioId,
            UpdatedBy     = UsuarioId,
        };

        db.NomencladorMaestro.Add(nuevo);
        await db.SaveChangesAsync();

        db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
        {
            NomencladorMaestroId = nuevo.Id,
            Accion               = "ALTA",
            FechaEvento          = DateTime.UtcNow,
            UsuarioId            = UsuarioId,
            UsuarioNombre        = UsuarioNombre,
            Origen               = "MANUAL",
            NombreNuevo          = nuevo.Nombre,
            VigenciaDesdeNuevo   = nuevo.VigenciaDesde,
            VigenciaHastaNuevo   = nuevo.VigenciaHasta,
            ActivoNuevo          = nuevo.Activo,
            DatosNuevos          = JsonSerializer.Serialize(MapearDto(nuevo)),
        });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, MapearDto(nuevo));
    }

    // ── PUT /api/nomenclador/{id} ────────────────────────────────
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<NomencladorMaestroDto>> Actualizar(int id, [FromBody] CrearEditarNomencladorMaestroDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        var n = await db.NomencladorMaestro.FindAsync(id);
        if (n is null)
            return NotFound(new { mensaje = $"No se encontró el nomenclador con ID {id}." });

        if (await db.NomencladorMaestro.AnyAsync(x => x.Nombre.ToLower() == dto.Nombre.ToLower() && x.Id != id))
            return BadRequest(new { mensaje = $"Ya existe otro nomenclador con el nombre '{dto.Nombre}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        bool cambioNombre = n.Nombre        != dto.Nombre.Trim();
        bool cambioDesde  = n.VigenciaDesde != desde;
        bool cambioHasta  = n.VigenciaHasta != hasta;
        bool huboCambios  = cambioNombre || cambioDesde || cambioHasta;

        var antNombre = n.Nombre;
        var antDesde  = n.VigenciaDesde;
        var antHasta  = n.VigenciaHasta;
        var antActivo = n.Activo;

        n.Nombre        = dto.Nombre.Trim();
        n.VigenciaDesde = desde;
        n.VigenciaHasta = hasta;
        n.Activo        = DerivarActivo(hasta);
        n.UpdatedAt     = DateTime.UtcNow;
        n.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        if (huboCambios)
        {
            db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
            {
                NomencladorMaestroId  = n.Id,
                Accion                = "MODIFICACION",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = antNombre,
                VigenciaDesdeAnterior = antDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = n.Nombre,
                VigenciaDesdeNuevo    = n.VigenciaDesde,
                VigenciaHastaNuevo    = n.VigenciaHasta,
                ActivoNuevo           = n.Activo,
                DatosAnteriores       = JsonSerializer.Serialize(new { Nombre = antNombre, VigenciaDesde = antDesde.ToString("yyyy-MM-dd"), VigenciaHasta = antHasta.ToString("yyyy-MM-dd"), Activo = antActivo }),
                DatosNuevos           = JsonSerializer.Serialize(MapearDto(n)),
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(n));
    }

    // ── PATCH /api/nomenclador/{id}/vigencia ─────────────────────
    [HttpPatch("{id:int}/vigencia")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<NomencladorMaestroDto>> ActualizarVigencia(int id, [FromBody] ActualizarVigenciaNomencladorDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VigenciaDesde) || string.IsNullOrWhiteSpace(dto.VigenciaHasta))
            return BadRequest(new { mensaje = "vigenciaDesde y vigenciaHasta son obligatorias." });

        if (!DateOnly.TryParse(dto.VigenciaDesde, out var desde) ||
            !DateOnly.TryParse(dto.VigenciaHasta, out var hasta))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Use yyyy-MM-dd." });

        if (hasta < desde)
            return BadRequest(new { mensaje = "vigenciaHasta debe ser mayor o igual a vigenciaDesde." });

        var n = await db.NomencladorMaestro.FindAsync(id);
        if (n is null)
            return NotFound(new { mensaje = $"No se encontró el nomenclador con ID {id}." });

        var antDesde = n.VigenciaDesde;
        var antHasta = n.VigenciaHasta;
        var antActivo = n.Activo;

        n.VigenciaDesde = desde;
        n.VigenciaHasta = hasta;
        n.Activo        = DerivarActivo(hasta);
        n.UpdatedAt     = DateTime.UtcNow;
        n.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
        {
            NomencladorMaestroId  = n.Id,
            Accion                = "CAMBIO_VIGENCIA",
            FechaEvento           = DateTime.UtcNow,
            UsuarioId             = UsuarioId,
            UsuarioNombre         = UsuarioNombre,
            Origen                = "MANUAL",
            NombreAnterior        = n.Nombre,
            VigenciaDesdeAnterior = antDesde,
            VigenciaHastaAnterior = antHasta,
            ActivoAnterior        = antActivo,
            NombreNuevo           = n.Nombre,
            VigenciaDesdeNuevo    = n.VigenciaDesde,
            VigenciaHastaNuevo    = n.VigenciaHasta,
            ActivoNuevo           = n.Activo,
        });
        await db.SaveChangesAsync();

        return Ok(MapearDto(n));
    }

    // ── PATCH /api/nomenclador/{id}/estado ───────────────────────
    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<NomencladorMaestroDto>> ActualizarEstado(int id, [FromBody] ActualizarEstadoNomencladorDto dto)
    {
        var n = await db.NomencladorMaestro.FindAsync(id);
        if (n is null)
            return NotFound(new { mensaje = $"No se encontró el nomenclador con ID {id}." });

        var antHasta  = n.VigenciaHasta;
        var antActivo = n.Activo;

        var nuevaHasta = dto.Activo
            ? new DateOnly(9999, 12, 31)
            : DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));

        n.VigenciaHasta = nuevaHasta;
        n.Activo        = dto.Activo;
        n.UpdatedAt     = DateTime.UtcNow;
        n.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        if (antHasta != nuevaHasta)
        {
            db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
            {
                NomencladorMaestroId  = n.Id,
                Accion                = "CAMBIO_VIGENCIA",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = n.Nombre,
                VigenciaDesdeAnterior = n.VigenciaDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = n.Nombre,
                VigenciaDesdeNuevo    = n.VigenciaDesde,
                VigenciaHastaNuevo    = n.VigenciaHasta,
                ActivoNuevo           = n.Activo,
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(n));
    }

    // ── GET /api/nomenclador/{id}/auditoria ──────────────────────
    [HttpGet("{id:int}/auditoria")]
    public async Task<ActionResult<List<NomencladorMaestroAuditLogDto>>> ObtenerAuditoriaPorId(int id)
    {
        var existe = await db.NomencladorMaestro.AnyAsync(n => n.Id == id);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró el nomenclador con ID {id}." });

        var logs = await db.NomencladorMaestroAuditLog
            .Include(l => l.NomencladorMaestro)
            .Where(l => l.NomencladorMaestroId == id)
            .OrderByDescending(l => l.FechaEvento)
            .Select(l => MapearLogDto(l))
            .ToListAsync();

        return Ok(logs);
    }

    // ── GET /api/nomenclador/auditoria ───────────────────────────
    [HttpGet("auditoria")]
    public async Task<ActionResult<List<NomencladorMaestroAuditLogDto>>> ObtenerAuditoriaGlobal(
        [FromQuery] string? usuarioNombre,
        [FromQuery] string? fechaDesde,
        [FromQuery] string? fechaHasta,
        [FromQuery] string? accion,
        [FromQuery] int?    nomencladorId)
    {
        var query = db.NomencladorMaestroAuditLog
            .Include(l => l.NomencladorMaestro)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(l => l.UsuarioNombre.ToLower().Contains(usuarioNombre.ToLower()));

        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);

        if (nomencladorId.HasValue)
            query = query.Where(l => l.NomencladorMaestroId == nomencladorId.Value);

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

    // ── GET /api/nomenclador/exportar ────────────────────────────
    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar()
    {
        var nomencladores = await db.NomencladorMaestro
            .OrderBy(n => n.Nombre)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Nomencladores");

        ws.Cell(1, 1).Value = "ID";
        ws.Cell(1, 2).Value = "Nombre";
        ws.Cell(1, 3).Value = "Vigencia Desde";
        ws.Cell(1, 4).Value = "Vigencia Hasta";
        ws.Cell(1, 5).Value = "Activo";

        var header = ws.Range("A1:E1");
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
        header.Style.Font.FontColor = XLColor.White;

        for (int i = 0; i < nomencladores.Count; i++)
        {
            var n = nomencladores[i];
            ws.Cell(i + 2, 1).Value = n.Id;
            ws.Cell(i + 2, 2).Value = n.Nombre;
            ws.Cell(i + 2, 3).Value = n.VigenciaDesde.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 4).Value = n.VigenciaHasta.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 5).Value = n.Activo ? "SI" : "NO";
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"nomencladores-{DateTime.UtcNow:yyyyMMdd}.xlsx"
        );
    }

    // ── POST /api/nomenclador/importar/preview ───────────────────
    [HttpPost("importar/preview")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<NomencladorMaestroImportPreviewDto>> ImportarPreview(IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Debe adjuntar un archivo Excel." });

        var filas = LeerExcel(archivo);
        if (filas.Count == 0)
            return BadRequest(new { mensaje = "El archivo no contiene filas de datos." });

        var nombres = filas.Select(f => f.Nombre.Trim().ToLower()).ToList();
        var existentes = await db.NomencladorMaestro
            .Where(n => nombres.Contains(n.Nombre.ToLower()))
            .ToListAsync();

        var transactionId = Guid.NewGuid();
        var preview = new NomencladorMaestroImportPreviewDto
        {
            TransactionId = transactionId,
            Filas = filas.Select(f =>
            {
                var ex = existentes.FirstOrDefault(e => e.Nombre.ToLower() == f.Nombre.Trim().ToLower());
                return new NomencladorMaestroImportPreviewRowDto
                {
                    NombreImport        = f.Nombre.Trim(),
                    VigenciaDesdeImport = f.VigenciaDesde,
                    VigenciaHastaImport = f.VigenciaHasta,
                    IdExistente          = ex?.Id,
                    NombreActual         = ex?.Nombre,
                    VigenciaDesdeActual  = ex?.VigenciaDesde.ToString("yyyy-MM-dd"),
                    VigenciaHastaActual  = ex?.VigenciaHasta.ToString("yyyy-MM-dd"),
                    ActivoActual         = ex?.Activo,
                    HayDiferenciaNombre   = ex != null && ex.Nombre != f.Nombre.Trim(),
                    HayDiferenciaVigencia = ex != null &&
                        (ex.VigenciaDesde.ToString("yyyy-MM-dd") != f.VigenciaDesde ||
                         ex.VigenciaHasta.ToString("yyyy-MM-dd") != f.VigenciaHasta),
                    EsNueva = ex == null,
                };
            }).ToList()
        };

        return Ok(preview);
    }

    // ── POST /api/nomenclador/importar/confirmar ─────────────────
    [HttpPost("importar/confirmar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult> ImportarConfirmar([FromBody] ConfirmarImportacionNomencladorDto dto)
    {
        if (dto.Filas == null || dto.Filas.Count == 0)
            return BadRequest(new { mensaje = "No hay filas para importar." });

        var ahora = DateTime.UtcNow;
        int creadas = 0, actualizadas = 0;

        foreach (var fila in dto.Filas)
        {
            if (string.IsNullOrWhiteSpace(fila.Nombre)) continue;
            if (ValidarFilaImport(fila) != null) continue;

            var desde = DateOnly.Parse(fila.VigenciaDesde);
            var hasta = DateOnly.Parse(fila.VigenciaHasta);

            var existente = await db.NomencladorMaestro
                .FirstOrDefaultAsync(n => n.Nombre.ToLower() == fila.Nombre.Trim().ToLower());

            if (existente == null)
            {
                var nuevo = new NomencladorMaestro
                {
                    Nombre        = fila.Nombre.Trim(),
                    VigenciaDesde = desde,
                    VigenciaHasta = hasta,
                    Activo        = DerivarActivo(hasta),
                    CreatedAt     = ahora,
                    UpdatedAt     = ahora,
                    CreatedBy     = UsuarioId,
                    UpdatedBy     = UsuarioId,
                };
                db.NomencladorMaestro.Add(nuevo);
                await db.SaveChangesAsync();

                db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
                {
                    NomencladorMaestroId = nuevo.Id,
                    Accion               = "ALTA",
                    FechaEvento          = ahora,
                    UsuarioId            = UsuarioId,
                    UsuarioNombre        = UsuarioNombre,
                    Origen               = "IMPORTACION",
                    TransactionId        = dto.TransactionId,
                    NombreNuevo          = nuevo.Nombre,
                    VigenciaDesdeNuevo   = nuevo.VigenciaDesde,
                    VigenciaHastaNuevo   = nuevo.VigenciaHasta,
                    ActivoNuevo          = nuevo.Activo,
                    DatosNuevos          = JsonSerializer.Serialize(fila),
                });
                creadas++;
            }
            else
            {
                var antNombre = existente.Nombre;
                var antDesde  = existente.VigenciaDesde;
                var antHasta  = existente.VigenciaHasta;
                var antActivo = existente.Activo;

                existente.Nombre        = fila.Nombre.Trim();
                existente.VigenciaDesde = desde;
                existente.VigenciaHasta = hasta;
                existente.Activo        = DerivarActivo(hasta);
                existente.UpdatedAt     = ahora;
                existente.UpdatedBy     = UsuarioId;

                await db.SaveChangesAsync();

                db.NomencladorMaestroAuditLog.Add(new NomencladorMaestroAuditLog
                {
                    NomencladorMaestroId  = existente.Id,
                    Accion                = "IMPORTACION",
                    FechaEvento           = ahora,
                    UsuarioId             = UsuarioId,
                    UsuarioNombre         = UsuarioNombre,
                    Origen                = "IMPORTACION",
                    TransactionId         = dto.TransactionId,
                    NombreAnterior        = antNombre,
                    VigenciaDesdeAnterior = antDesde,
                    VigenciaHastaAnterior = antHasta,
                    ActivoAnterior        = antActivo,
                    NombreNuevo           = existente.Nombre,
                    VigenciaDesdeNuevo    = existente.VigenciaDesde,
                    VigenciaHastaNuevo    = existente.VigenciaHasta,
                    ActivoNuevo           = existente.Activo,
                    DatosAnteriores       = JsonSerializer.Serialize(new { antNombre, antDesde, antHasta, antActivo }),
                    DatosNuevos           = JsonSerializer.Serialize(fila),
                });
                actualizadas++;
            }
        }

        await db.SaveChangesAsync();

        return Ok(new
        {
            mensaje       = $"Importación completada. Creadas: {creadas}, Actualizadas: {actualizadas}.",
            transactionId = dto.TransactionId,
            creadas,
            actualizadas
        });
    }

    // ── Helpers privados ─────────────────────────────────────────

    private static bool DerivarActivo(DateOnly vigenciaHasta) =>
        vigenciaHasta >= DateOnly.FromDateTime(DateTime.UtcNow.Date);

    private static string? ValidarDto(CrearEditarNomencladorMaestroDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return "El nombre del nomenclador es obligatorio.";
        if (dto.Nombre.Length > 150)
            return "El nombre no puede superar 150 caracteres.";
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

    private static string? ValidarFilaImport(NomencladorMaestroImportRowDto fila)
    {
        if (string.IsNullOrWhiteSpace(fila.VigenciaDesde) || string.IsNullOrWhiteSpace(fila.VigenciaHasta))
            return "vigencias obligatorias";
        if (!DateOnly.TryParse(fila.VigenciaDesde, out var d) || !DateOnly.TryParse(fila.VigenciaHasta, out var h))
            return "formato de fecha inválido";
        if (h < d) return "vigenciaHasta < vigenciaDesde";
        return null;
    }

    private static List<NomencladorMaestroImportRowDto> LeerExcel(IFormFile archivo)
    {
        var filas = new List<NomencladorMaestroImportRowDto>();
        using var stream = archivo.OpenReadStream();
        using var wb     = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        for (int r = 2; r <= lastRow; r++)
        {
            var nombre = ws.Cell(r, 2).GetString().Trim();
            if (string.IsNullOrWhiteSpace(nombre)) continue;

            filas.Add(new NomencladorMaestroImportRowDto
            {
                Nombre        = nombre,
                VigenciaDesde = ws.Cell(r, 3).GetString().Trim(),
                VigenciaHasta = ws.Cell(r, 4).GetString().Trim(),
            });
        }
        return filas;
    }

    private static NomencladorMaestroDto MapearDto(NomencladorMaestro n) => new()
    {
        Id            = n.Id,
        Nombre        = n.Nombre,
        VigenciaDesde = n.VigenciaDesde.ToString("yyyy-MM-dd"),
        VigenciaHasta = n.VigenciaHasta.ToString("yyyy-MM-dd"),
        Activo        = n.Activo,
        Estado        = n.Activo ? "Vigente" : "Inactivo",
        CreatedAt     = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UpdatedAt     = n.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        CreatedBy     = n.CreatedBy,
        UpdatedBy     = n.UpdatedBy,
    };

    private static NomencladorMaestroAuditLogDto MapearLogDto(NomencladorMaestroAuditLog l) => new()
    {
        Id                   = l.Id,
        NomencladorMaestroId = l.NomencladorMaestroId,
        NombreNomenclador    = l.NomencladorMaestro?.Nombre ?? string.Empty,
        Accion               = l.Accion,
        FechaEvento          = l.FechaEvento.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UsuarioId            = l.UsuarioId,
        UsuarioNombre        = l.UsuarioNombre,
        Origen               = l.Origen,
        TransactionId        = l.TransactionId,
        NombreAnterior          = l.NombreAnterior,
        VigenciaDesdeAnterior   = l.VigenciaDesdeAnterior?.ToString("yyyy-MM-dd"),
        VigenciaHastaAnterior   = l.VigenciaHastaAnterior?.ToString("yyyy-MM-dd"),
        ActivoAnterior          = l.ActivoAnterior,
        NombreNuevo             = l.NombreNuevo,
        VigenciaDesdeNuevo      = l.VigenciaDesdeNuevo?.ToString("yyyy-MM-dd"),
        VigenciaHastaNuevo      = l.VigenciaHastaNuevo?.ToString("yyyy-MM-dd"),
        ActivoNuevo             = l.ActivoNuevo,
        DatosAnteriores         = l.DatosAnteriores,
        DatosNuevos             = l.DatosNuevos,
    };
}
