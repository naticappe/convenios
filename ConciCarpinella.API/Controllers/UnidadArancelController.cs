// ============================================================
// CONTROLLER: UnidadArancel
// Gestión completa del módulo de Unidades Arancelarias.
// Endpoints:
//   GET    /api/unidad-arancel                 - Lista con filtros
//   GET    /api/unidad-arancel/{id}            - Detalle
//   POST   /api/unidad-arancel                 - Alta
//   PUT    /api/unidad-arancel/{id}            - Edición completa
//   PATCH  /api/unidad-arancel/{id}/vigencia   - Actualizar vigencia
//   PATCH  /api/unidad-arancel/{id}/estado     - Activar/inactivar
//   GET    /api/unidad-arancel/{id}/auditoria  - Historial de una unidad
//   GET    /api/unidad-arancel/auditoria       - Auditoría global con filtros
//   GET    /api/unidad-arancel/exportar        - Descarga Excel
//   POST   /api/unidad-arancel/importar/preview- Previsualiza importación
//   POST   /api/unidad-arancel/importar/confirmar - Confirma importación
// ============================================================

using System.Security.Claims;
using System.Text;
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
[Route("api/unidad-arancel")]
[Authorize]
public class UnidadArancelController(ApplicationDbContext db) : ControllerBase
{
    // ── Helpers de usuario autenticado ───────────────────────────
    private long? UsuarioId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string UsuarioNombre =>
        $"{User.FindFirstValue("nombre") ?? ""} {User.FindFirstValue("apellido") ?? ""}".Trim();

    // ── GET /api/unidad-arancel ──────────────────────────────────
    /// <summary>Lista unidades arancel con filtros opcionales.</summary>
    [HttpGet]
    public async Task<ActionResult<List<UnidadArancelListDto>>> ObtenerTodas(
        [FromQuery] string? buscar,
        [FromQuery] string? estado)
    {
        var query = db.UnidadesArancel.AsQueryable();

        if (!string.IsNullOrWhiteSpace(buscar))
            query = query.Where(u => u.Nombre.ToLower().Contains(buscar.ToLower()));

        var lista = await query
            .OrderBy(u => u.Nombre)
            .Select(u => new UnidadArancelListDto
            {
                Id            = u.Id,
                Nombre        = u.Nombre,
                VigenciaDesde = u.VigenciaDesde.ToString("yyyy-MM-dd"),
                VigenciaHasta = u.VigenciaHasta.ToString("yyyy-MM-dd"),
                Activo        = u.Activo,
                Estado        = u.Activo ? "Vigente" : "Inactivo",
                CreatedAt     = u.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                UpdatedAt     = u.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            })
            .ToListAsync();

        // Filtro por estado después de proyección (simple, pocos registros)
        if (!string.IsNullOrWhiteSpace(estado))
            lista = lista.Where(u => u.Estado == estado).ToList();

        return Ok(lista);
    }

    // ── GET /api/unidad-arancel/{id} ─────────────────────────────
    /// <summary>Detalle completo de una unidad arancel.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<UnidadArancelDto>> ObtenerPorId(int id)
    {
        var u = await db.UnidadesArancel.FindAsync(id);
        if (u is null)
            return NotFound(new { mensaje = $"No se encontró la unidad arancel con ID {id}." });

        return Ok(MapearDto(u));
    }

    // ── POST /api/unidad-arancel ─────────────────────────────────
    /// <summary>Crea una nueva unidad arancel. Genera log ALTA.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<UnidadArancelDto>> Crear([FromBody] CrearEditarUnidadArancelDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        if (await db.UnidadesArancel.AnyAsync(u => u.Nombre.ToLower() == dto.Nombre.ToLower()))
            return BadRequest(new { mensaje = $"Ya existe una unidad arancel con el nombre '{dto.Nombre}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        var nueva = new UnidadArancel
        {
            Nombre        = dto.Nombre.Trim(),
            VigenciaDesde = desde,
            VigenciaHasta = hasta,
            Activo        = true,
            CreatedAt     = DateTime.UtcNow,
            UpdatedAt     = DateTime.UtcNow,
            CreatedBy     = UsuarioId,
            UpdatedBy     = UsuarioId,
        };

        db.UnidadesArancel.Add(nueva);
        await db.SaveChangesAsync();

        // ── Auditoría: ALTA ──────────────────────────────────────
        db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
        {
            UnidadArancelId = nueva.Id,
            Accion          = "ALTA",
            FechaEvento     = DateTime.UtcNow,
            UsuarioId       = UsuarioId,
            UsuarioNombre   = UsuarioNombre,
            Origen          = "MANUAL",
            NombreNuevo          = nueva.Nombre,
            VigenciaDesdeNuevo   = nueva.VigenciaDesde,
            VigenciaHastaNuevo   = nueva.VigenciaHasta,
            ActivoNuevo          = nueva.Activo,
            DatosNuevos          = JsonSerializer.Serialize(MapearDto(nueva)),
        });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nueva.Id }, MapearDto(nueva));
    }

    // ── PUT /api/unidad-arancel/{id} ─────────────────────────────
    /// <summary>Actualiza nombre y vigencia de una unidad. Genera log MODIFICACION.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<UnidadArancelDto>> Actualizar(int id, [FromBody] CrearEditarUnidadArancelDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        var u = await db.UnidadesArancel.FindAsync(id);
        if (u is null)
            return NotFound(new { mensaje = $"No se encontró la unidad arancel con ID {id}." });

        if (await db.UnidadesArancel.AnyAsync(x => x.Nombre.ToLower() == dto.Nombre.ToLower() && x.Id != id))
            return BadRequest(new { mensaje = $"Ya existe otra unidad arancel con el nombre '{dto.Nombre}'." });

        var desde = DateOnly.Parse(dto.VigenciaDesde);
        var hasta = DateOnly.Parse(dto.VigenciaHasta);

        // Detectar si hubo cambios reales antes de modificar
        bool cambioNombre  = u.Nombre        != dto.Nombre.Trim();
        bool cambioDesde   = u.VigenciaDesde != desde;
        bool cambioHasta   = u.VigenciaHasta != hasta;
        bool huboCambios   = cambioNombre || cambioDesde || cambioHasta;

        // Snapshot anterior (sólo necesario si hay cambios)
        var antNombre = u.Nombre;
        var antDesde  = u.VigenciaDesde;
        var antHasta  = u.VigenciaHasta;
        var antActivo = u.Activo;

        u.Nombre        = dto.Nombre.Trim();
        u.VigenciaDesde = desde;
        u.VigenciaHasta = hasta;
        u.Activo        = DerivarActivo(hasta);   // consistencia con fechas
        u.UpdatedAt     = DateTime.UtcNow;
        u.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        // ── Auditoría: solo si cambió algo ───────────────────────
        if (huboCambios)
        {
            db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
            {
                UnidadArancelId       = u.Id,
                Accion                = "MODIFICACION",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = antNombre,
                VigenciaDesdeAnterior = antDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = u.Nombre,
                VigenciaDesdeNuevo    = u.VigenciaDesde,
                VigenciaHastaNuevo    = u.VigenciaHasta,
                ActivoNuevo           = u.Activo,
                DatosAnteriores       = JsonSerializer.Serialize(new { Nombre = antNombre, VigenciaDesde = antDesde.ToString("yyyy-MM-dd"), VigenciaHasta = antHasta.ToString("yyyy-MM-dd"), Activo = antActivo }),
                DatosNuevos           = JsonSerializer.Serialize(MapearDto(u)),
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(u));
    }

    // ── PATCH /api/unidad-arancel/{id}/vigencia ──────────────────
    /// <summary>Actualiza sólo la vigencia. Genera log CAMBIO_VIGENCIA.</summary>
    [HttpPatch("{id:int}/vigencia")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<UnidadArancelDto>> ActualizarVigencia(int id, [FromBody] ActualizarVigenciaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.VigenciaDesde) || string.IsNullOrWhiteSpace(dto.VigenciaHasta))
            return BadRequest(new { mensaje = "vigencia_desde y vigencia_hasta son obligatorias." });

        if (!DateOnly.TryParse(dto.VigenciaDesde, out var desde) ||
            !DateOnly.TryParse(dto.VigenciaHasta, out var hasta))
            return BadRequest(new { mensaje = "Formato de fecha inválido. Use yyyy-MM-dd." });

        if (hasta < desde)
            return BadRequest(new { mensaje = "vigencia_hasta debe ser mayor o igual a vigencia_desde." });

        var u = await db.UnidadesArancel.FindAsync(id);
        if (u is null)
            return NotFound(new { mensaje = $"No se encontró la unidad arancel con ID {id}." });

        var antDesde = u.VigenciaDesde;
        var antHasta = u.VigenciaHasta;

        u.VigenciaDesde = desde;
        u.VigenciaHasta = hasta;
        u.Activo        = DerivarActivo(hasta);   // consistencia con fechas
        u.UpdatedAt     = DateTime.UtcNow;
        u.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
        {
            UnidadArancelId       = u.Id,
            Accion                = "CAMBIO_VIGENCIA",
            FechaEvento           = DateTime.UtcNow,
            UsuarioId             = UsuarioId,
            UsuarioNombre         = UsuarioNombre,
            Origen                = "MANUAL",
            NombreAnterior        = u.Nombre,
            VigenciaDesdeAnterior = antDesde,
            VigenciaHastaAnterior = antHasta,
            ActivoAnterior        = u.Activo,
            NombreNuevo           = u.Nombre,
            VigenciaDesdeNuevo    = u.VigenciaDesde,
            VigenciaHastaNuevo    = u.VigenciaHasta,
            ActivoNuevo           = u.Activo,
        });
        await db.SaveChangesAsync();

        return Ok(MapearDto(u));
    }

    // ── PATCH /api/unidad-arancel/{id}/estado ────────────────────
    /// <summary>
    /// Atajo de vigencia:
    ///   activo=true  → vigencia_hasta = 9999-12-31  (reabre)
    ///   activo=false → vigencia_hasta = ayer         (cierra)
    /// Se registra como CAMBIO_VIGENCIA, igual que editar la fecha manualmente.
    /// </summary>
    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<UnidadArancelDto>> ActualizarEstado(int id, [FromBody] ActualizarEstadoDto dto)
    {
        var u = await db.UnidadesArancel.FindAsync(id);
        if (u is null)
            return NotFound(new { mensaje = $"No se encontró la unidad arancel con ID {id}." });

        var antHasta  = u.VigenciaHasta;
        var antActivo = u.Activo;

        // Calcular la nueva fecha_hasta según la intención
        var nuevaHasta = dto.Activo
            ? new DateOnly(9999, 12, 31)                               // Vigente: abre indefinidamente
            : DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1));      // Inactivo: cierra ayer

        u.VigenciaHasta = nuevaHasta;
        u.Activo        = dto.Activo;
        u.UpdatedAt     = DateTime.UtcNow;
        u.UpdatedBy     = UsuarioId;

        await db.SaveChangesAsync();

        // Sólo auditar si la fecha realmente cambió
        if (antHasta != nuevaHasta)
        {
            db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
            {
                UnidadArancelId       = u.Id,
                Accion                = "CAMBIO_VIGENCIA",
                FechaEvento           = DateTime.UtcNow,
                UsuarioId             = UsuarioId,
                UsuarioNombre         = UsuarioNombre,
                Origen                = "MANUAL",
                NombreAnterior        = u.Nombre,
                VigenciaDesdeAnterior = u.VigenciaDesde,
                VigenciaHastaAnterior = antHasta,
                ActivoAnterior        = antActivo,
                NombreNuevo           = u.Nombre,
                VigenciaDesdeNuevo    = u.VigenciaDesde,
                VigenciaHastaNuevo    = u.VigenciaHasta,
                ActivoNuevo           = u.Activo,
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(u));
    }

    // ── GET /api/unidad-arancel/{id}/auditoria ───────────────────
    /// <summary>Historial de auditoría de una unidad específica.</summary>
    [HttpGet("{id:int}/auditoria")]
    public async Task<ActionResult<List<UnidadArancelAuditLogDto>>> ObtenerAuditoriaPorId(int id)
    {
        var existe = await db.UnidadesArancel.AnyAsync(u => u.Id == id);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró la unidad arancel con ID {id}." });

        var logs = await db.UnidadesArancelAuditLog
            .Include(l => l.UnidadArancel)
            .Where(l => l.UnidadArancelId == id)
            .OrderByDescending(l => l.FechaEvento)
            .Select(l => MapearLogDto(l))
            .ToListAsync();

        return Ok(logs);
    }

    // ── GET /api/unidad-arancel/auditoria ────────────────────────
    /// <summary>Auditoría global con filtros.</summary>
    [HttpGet("auditoria")]
    public async Task<ActionResult<List<UnidadArancelAuditLogDto>>> ObtenerAuditoriaGlobal(
        [FromQuery] string?  usuarioNombre,
        [FromQuery] string?  fechaDesde,
        [FromQuery] string?  fechaHasta,
        [FromQuery] string?  accion,
        [FromQuery] int?     unidadArancelId)
    {
        var query = db.UnidadesArancelAuditLog
            .Include(l => l.UnidadArancel)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(l => l.UsuarioNombre.ToLower().Contains(usuarioNombre.ToLower()));

        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);

        if (unidadArancelId.HasValue)
            query = query.Where(l => l.UnidadArancelId == unidadArancelId.Value);

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

    // ── GET /api/unidad-arancel/exportar ─────────────────────────
    /// <summary>Descarga la tabla completa como archivo Excel.</summary>
    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar()
    {
        var unidades = await db.UnidadesArancel
            .OrderBy(u => u.Nombre)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Unidades Arancel");

        // Encabezados
        ws.Cell(1, 1).Value = "ID";
        ws.Cell(1, 2).Value = "Nombre";
        ws.Cell(1, 3).Value = "Vigencia Desde";
        ws.Cell(1, 4).Value = "Vigencia Hasta";
        ws.Cell(1, 5).Value = "Activo";

        // Estilo encabezado
        var header = ws.Range("A1:E1");
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
        header.Style.Font.FontColor = XLColor.White;

        // Datos
        for (int i = 0; i < unidades.Count; i++)
        {
            var u = unidades[i];
            ws.Cell(i + 2, 1).Value = u.Id;
            ws.Cell(i + 2, 2).Value = u.Nombre;
            ws.Cell(i + 2, 3).Value = u.VigenciaDesde.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 4).Value = u.VigenciaHasta.ToString("yyyy-MM-dd");
            ws.Cell(i + 2, 5).Value = u.Activo ? "SI" : "NO";
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"unidades-arancel-{DateTime.UtcNow:yyyyMMdd}.xlsx"
        );
    }

    // ── POST /api/unidad-arancel/importar/preview ────────────────
    /// <summary>
    /// Recibe un archivo Excel y devuelve una previsualización comparativa
    /// entre los datos del archivo y los existentes en la base.
    /// </summary>
    [HttpPost("importar/preview")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<UnidadArancelImportPreviewDto>> ImportarPreview(IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Debe adjuntar un archivo Excel." });

        var filas = LeerExcel(archivo);
        if (filas.Count == 0)
            return BadRequest(new { mensaje = "El archivo no contiene filas de datos." });

        var nombres = filas.Select(f => f.Nombre.Trim().ToLower()).ToList();
        var existentes = await db.UnidadesArancel
            .Where(u => nombres.Contains(u.Nombre.ToLower()))
            .ToListAsync();

        var transactionId = Guid.NewGuid();
        var preview = new UnidadArancelImportPreviewDto
        {
            TransactionId = transactionId,
            Filas = filas.Select(f =>
            {
                var ex = existentes.FirstOrDefault(e => e.Nombre.ToLower() == f.Nombre.Trim().ToLower());
                var hasDiffNombre   = ex != null && ex.Nombre != f.Nombre.Trim();
                var hasDiffVigencia = ex != null &&
                    (ex.VigenciaDesde.ToString("yyyy-MM-dd") != f.VigenciaDesde ||
                     ex.VigenciaHasta.ToString("yyyy-MM-dd") != f.VigenciaHasta);

                return new UnidadArancelImportPreviewRowDto
                {
                    NombreImport        = f.Nombre.Trim(),
                    VigenciaDesdeImport = f.VigenciaDesde,
                    VigenciaHastaImport = f.VigenciaHasta,
                    IdExistente          = ex?.Id,
                    NombreActual         = ex?.Nombre,
                    VigenciaDesdeActual  = ex?.VigenciaDesde.ToString("yyyy-MM-dd"),
                    VigenciaHastaActual  = ex?.VigenciaHasta.ToString("yyyy-MM-dd"),
                    ActivoActual         = ex?.Activo,
                    HayDiferenciaNombre   = hasDiffNombre,
                    HayDiferenciaVigencia = hasDiffVigencia,
                    EsNueva               = ex == null,
                };
            }).ToList()
        };

        return Ok(preview);
    }

    // ── POST /api/unidad-arancel/importar/confirmar ──────────────
    /// <summary>
    /// Confirma la importación previamente previsualizada.
    /// Inserta o actualiza cada fila y genera logs de auditoría con el transaction_id.
    /// </summary>
    [HttpPost("importar/confirmar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult> ImportarConfirmar([FromBody] ConfirmarImportacionDto dto)
    {
        if (dto.Filas == null || dto.Filas.Count == 0)
            return BadRequest(new { mensaje = "No hay filas para importar." });

        var ahora = DateTime.UtcNow;
        int creadas = 0, actualizadas = 0;

        foreach (var fila in dto.Filas)
        {
            if (string.IsNullOrWhiteSpace(fila.Nombre)) continue;

            var validacion = ValidarFilaImport(fila);
            if (validacion != null) continue; // skip filas inválidas silenciosamente

            var desde = DateOnly.Parse(fila.VigenciaDesde);
            var hasta = DateOnly.Parse(fila.VigenciaHasta);

            var existente = await db.UnidadesArancel
                .FirstOrDefaultAsync(u => u.Nombre.ToLower() == fila.Nombre.Trim().ToLower());

            if (existente == null)
            {
                // Nueva
                var nueva = new UnidadArancel
                {
                    Nombre        = fila.Nombre.Trim(),
                    VigenciaDesde = desde,
                    VigenciaHasta = hasta,
                    Activo        = true,
                    CreatedAt     = ahora,
                    UpdatedAt     = ahora,
                    CreatedBy     = UsuarioId,
                    UpdatedBy     = UsuarioId,
                };
                db.UnidadesArancel.Add(nueva);
                await db.SaveChangesAsync();

                db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
                {
                    UnidadArancelId    = nueva.Id,
                    Accion             = "ALTA",
                    FechaEvento        = ahora,
                    UsuarioId          = UsuarioId,
                    UsuarioNombre      = UsuarioNombre,
                    Origen             = "IMPORTACION",
                    TransactionId      = dto.TransactionId,
                    NombreNuevo        = nueva.Nombre,
                    VigenciaDesdeNuevo = nueva.VigenciaDesde,
                    VigenciaHastaNuevo = nueva.VigenciaHasta,
                    ActivoNuevo        = nueva.Activo,
                    DatosNuevos        = JsonSerializer.Serialize(fila),
                });
                creadas++;
            }
            else
            {
                // Actualizar
                var antNombre = existente.Nombre;
                var antDesde  = existente.VigenciaDesde;
                var antHasta  = existente.VigenciaHasta;
                var antActivo = existente.Activo;

                existente.Nombre        = fila.Nombre.Trim();
                existente.VigenciaDesde = desde;
                existente.VigenciaHasta = hasta;
                existente.UpdatedAt     = ahora;
                existente.UpdatedBy     = UsuarioId;

                await db.SaveChangesAsync();

                db.UnidadesArancelAuditLog.Add(new UnidadArancelAuditLog
                {
                    UnidadArancelId       = existente.Id,
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

    /// <summary>
    /// Deriva el estado activo/inactivo a partir de vigencia_hasta.
    /// Si la fecha ya pasó → inactivo; si es hoy o futura → vigente.
    /// </summary>
    private static bool DerivarActivo(DateOnly vigenciaHasta) =>
        vigenciaHasta >= DateOnly.FromDateTime(DateTime.UtcNow.Date);

    private static string? ValidarDto(CrearEditarUnidadArancelDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nombre))
            return "El nombre de la unidad arancel es obligatorio.";
        if (dto.Nombre.Length > 150)
            return "El nombre no puede superar 150 caracteres.";
        if (string.IsNullOrWhiteSpace(dto.VigenciaDesde))
            return "vigencia_desde es obligatoria.";
        if (string.IsNullOrWhiteSpace(dto.VigenciaHasta))
            return "vigencia_hasta es obligatoria.";
        if (!DateOnly.TryParse(dto.VigenciaDesde, out var desde))
            return "Formato de vigencia_desde inválido. Use yyyy-MM-dd.";
        if (!DateOnly.TryParse(dto.VigenciaHasta, out var hasta))
            return "Formato de vigencia_hasta inválido. Use yyyy-MM-dd.";
        if (hasta < desde)
            return "vigencia_hasta debe ser mayor o igual a vigencia_desde.";
        return null;
    }

    private static string? ValidarFilaImport(UnidadArancelImportRowDto fila)
    {
        if (string.IsNullOrWhiteSpace(fila.VigenciaDesde) || string.IsNullOrWhiteSpace(fila.VigenciaHasta))
            return "vigencias obligatorias";
        if (!DateOnly.TryParse(fila.VigenciaDesde, out var d) || !DateOnly.TryParse(fila.VigenciaHasta, out var h))
            return "formato de fecha inválido";
        if (h < d)
            return "vigencia_hasta < vigencia_desde";
        return null;
    }

    private static List<UnidadArancelImportRowDto> LeerExcel(IFormFile archivo)
    {
        var filas = new List<UnidadArancelImportRowDto>();
        using var stream = archivo.OpenReadStream();
        using var wb     = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        // Asumimos fila 1 = encabezados, datos desde fila 2
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;
        for (int r = 2; r <= lastRow; r++)
        {
            var nombre = ws.Cell(r, 2).GetString().Trim(); // col B = Nombre
            if (string.IsNullOrWhiteSpace(nombre)) continue;

            filas.Add(new UnidadArancelImportRowDto
            {
                Nombre        = nombre,
                VigenciaDesde = ws.Cell(r, 3).GetString().Trim(),
                VigenciaHasta = ws.Cell(r, 4).GetString().Trim(),
            });
        }
        return filas;
    }

    private static UnidadArancelDto MapearDto(UnidadArancel u) => new()
    {
        Id            = u.Id,
        Nombre        = u.Nombre,
        VigenciaDesde = u.VigenciaDesde.ToString("yyyy-MM-dd"),
        VigenciaHasta = u.VigenciaHasta.ToString("yyyy-MM-dd"),
        Activo        = u.Activo,
        Estado        = u.Activo ? "Vigente" : "Inactivo",
        CreatedAt     = u.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UpdatedAt     = u.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        CreatedBy     = u.CreatedBy,
        UpdatedBy     = u.UpdatedBy,
    };

    private static UnidadArancelAuditLogDto MapearLogDto(UnidadArancelAuditLog l) => new()
    {
        Id              = l.Id,
        UnidadArancelId = l.UnidadArancelId,
        NombreUnidad    = l.UnidadArancel?.Nombre ?? string.Empty,
        Accion          = l.Accion,
        FechaEvento     = l.FechaEvento.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UsuarioId       = l.UsuarioId,
        UsuarioNombre   = l.UsuarioNombre,
        Origen          = l.Origen,
        TransactionId   = l.TransactionId,
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
