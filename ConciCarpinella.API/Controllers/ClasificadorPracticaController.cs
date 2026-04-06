// ============================================================
// CONTROLLER: ClasificadorPractica
// Gestión completa del módulo Clasificador de Prácticas.
// Endpoints:
//   GET    /api/clasificador-practicas                     - Lista con filtros
//   GET    /api/clasificador-practicas/{id}                - Detalle
//   POST   /api/clasificador-practicas                     - Alta
//   PUT    /api/clasificador-practicas/{id}                - Edición completa
//   PATCH  /api/clasificador-practicas/{id}/estado         - Activar/inactivar
//   GET    /api/clasificador-practicas/{id}/auditoria      - Historial de un registro
//   GET    /api/clasificador-practicas/auditoria           - Auditoría global con filtros
//   GET    /api/clasificador-practicas/exportar            - Descarga Excel
//   POST   /api/clasificador-practicas/importar/preview    - Previsualiza importación
//   POST   /api/clasificador-practicas/importar/confirmar  - Confirma importación
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
[Route("api/clasificador-practicas")]
[Authorize]
public class ClasificadorPracticaController(ApplicationDbContext db) : ControllerBase
{
    // ── Helpers de usuario autenticado ───────────────────────────
    private long? UsuarioId =>
        long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private string UsuarioNombre =>
        $"{User.FindFirstValue("nombre") ?? ""} {User.FindFirstValue("apellido") ?? ""}".Trim();

    // ── GET /api/clasificador-practicas ──────────────────────────
    /// <summary>Lista clasificadores con filtros opcionales.</summary>
    [HttpGet]
    public async Task<ActionResult<List<ClasificadorPracticaListDto>>> ObtenerTodos(
        [FromQuery] string? nivel1,
        [FromQuery] string? estado,
        [FromQuery] string? buscar)
    {
        var query = db.ClasificadoresPractica.AsQueryable();

        // Filtro exacto por Nivel1
        if (!string.IsNullOrWhiteSpace(nivel1))
            query = query.Where(c => c.Nivel1.ToLower() == nivel1.ToLower());

        // Filtro por estado
        if (!string.IsNullOrWhiteSpace(estado))
        {
            bool activo = estado.ToLower() == "activo";
            query = query.Where(c => c.Activo == activo);
        }

        // Búsqueda libre sobre Nivel2 y Nivel3 (OR)
        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var b = buscar.ToLower();
            query = query.Where(c =>
                c.Nivel2.ToLower().Contains(b) ||
                c.Nivel3.ToLower().Contains(b));
        }

        var lista = await query
            .OrderBy(c => c.Nivel1)
            .ThenBy(c => c.Nivel2)
            .ThenBy(c => c.Nivel3)
            .Select(c => new ClasificadorPracticaListDto
            {
                Id        = c.Id,
                Nivel1    = c.Nivel1,
                Nivel2    = c.Nivel2,
                Nivel3    = c.Nivel3,
                Activo    = c.Activo,
                Estado    = c.Activo ? "Activo" : "Inactivo",
                CreatedAt = c.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                UpdatedAt = c.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            })
            .ToListAsync();

        return Ok(lista);
    }

    // ── GET /api/clasificador-practicas/{id} ─────────────────────
    /// <summary>Detalle completo de un clasificador.</summary>
    [HttpGet("{id:int}")]
    public async Task<ActionResult<ClasificadorPracticaDto>> ObtenerPorId(int id)
    {
        var c = await db.ClasificadoresPractica.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el clasificador con ID {id}." });

        return Ok(MapearDto(c));
    }

    // ── POST /api/clasificador-practicas ─────────────────────────
    /// <summary>Crea un nuevo clasificador. Genera log ALTA.</summary>
    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ClasificadorPracticaDto>> Crear(
        [FromBody] CrearEditarClasificadorPracticaDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        if (await ValidarUnicidad(dto.Nivel1, dto.Nivel2, dto.Nivel3))
            return BadRequest(new { mensaje = $"Ya existe un clasificador con la combinación '{dto.Nivel1}' / '{dto.Nivel2}' / '{dto.Nivel3}'." });

        var nuevo = new ClasificadorPractica
        {
            Nivel1    = dto.Nivel1.Trim(),
            Nivel2    = dto.Nivel2.Trim(),
            Nivel3    = dto.Nivel3.Trim(),
            Activo    = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            CreatedBy = UsuarioId,
            UpdatedBy = UsuarioId,
        };

        db.ClasificadoresPractica.Add(nuevo);
        await db.SaveChangesAsync();

        // ── Auditoría: ALTA ──────────────────────────────────────
        db.ClasificadoresPracticaAuditLog.Add(new ClasificadorPracticaAuditLog
        {
            ClasificadorPracticaId = nuevo.Id,
            Accion        = "ALTA",
            FechaEvento   = DateTime.UtcNow,
            UsuarioId     = UsuarioId,
            UsuarioNombre = UsuarioNombre,
            Origen        = "MANUAL",
            Nivel1Nuevo   = nuevo.Nivel1,
            Nivel2Nuevo   = nuevo.Nivel2,
            Nivel3Nuevo   = nuevo.Nivel3,
            ActivoNuevo   = nuevo.Activo,
            DatosNuevos   = JsonSerializer.Serialize(MapearDto(nuevo)),
        });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, MapearDto(nuevo));
    }

    // ── PUT /api/clasificador-practicas/{id} ─────────────────────
    /// <summary>Edición completa. Genera log MODIFICACION solo si cambian los niveles.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ClasificadorPracticaDto>> Actualizar(
        int id, [FromBody] CrearEditarClasificadorPracticaDto dto)
    {
        var validacion = ValidarDto(dto);
        if (validacion != null) return BadRequest(new { mensaje = validacion });

        var c = await db.ClasificadoresPractica.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el clasificador con ID {id}." });

        // Verificar unicidad excluyendo el propio registro
        if (await db.ClasificadoresPractica.AnyAsync(x =>
            x.Nivel1.ToLower() == dto.Nivel1.Trim().ToLower() &&
            x.Nivel2.ToLower() == dto.Nivel2.Trim().ToLower() &&
            x.Nivel3.ToLower() == dto.Nivel3.Trim().ToLower() &&
            x.Id != id))
            return BadRequest(new { mensaje = $"Ya existe otro clasificador con la combinación '{dto.Nivel1}' / '{dto.Nivel2}' / '{dto.Nivel3}'." });

        // Detectar cambios reales en niveles
        bool cambioNivel1 = c.Nivel1 != dto.Nivel1.Trim();
        bool cambioNivel2 = c.Nivel2 != dto.Nivel2.Trim();
        bool cambioNivel3 = c.Nivel3 != dto.Nivel3.Trim();
        bool huboCambios  = cambioNivel1 || cambioNivel2 || cambioNivel3;

        // Snapshot anterior
        var antNivel1 = c.Nivel1;
        var antNivel2 = c.Nivel2;
        var antNivel3 = c.Nivel3;
        var antActivo = c.Activo;

        c.Nivel1    = dto.Nivel1.Trim();
        c.Nivel2    = dto.Nivel2.Trim();
        c.Nivel3    = dto.Nivel3.Trim();
        c.UpdatedAt = DateTime.UtcNow;
        c.UpdatedBy = UsuarioId;

        await db.SaveChangesAsync();

        // ── Auditoría: solo si cambió algún nivel ────────────────
        if (huboCambios)
        {
            db.ClasificadoresPracticaAuditLog.Add(new ClasificadorPracticaAuditLog
            {
                ClasificadorPracticaId = c.Id,
                Accion          = "MODIFICACION",
                FechaEvento     = DateTime.UtcNow,
                UsuarioId       = UsuarioId,
                UsuarioNombre   = UsuarioNombre,
                Origen          = "MANUAL",
                Nivel1Anterior  = antNivel1,
                Nivel2Anterior  = antNivel2,
                Nivel3Anterior  = antNivel3,
                ActivoAnterior  = antActivo,
                Nivel1Nuevo     = c.Nivel1,
                Nivel2Nuevo     = c.Nivel2,
                Nivel3Nuevo     = c.Nivel3,
                ActivoNuevo     = c.Activo,
                DatosAnteriores = JsonSerializer.Serialize(new { Nivel1 = antNivel1, Nivel2 = antNivel2, Nivel3 = antNivel3, Activo = antActivo }),
                DatosNuevos     = JsonSerializer.Serialize(MapearDto(c)),
            });
            await db.SaveChangesAsync();
        }

        return Ok(MapearDto(c));
    }

    // ── PATCH /api/clasificador-practicas/{id}/estado ────────────
    /// <summary>Activa o inactiva el clasificador. Genera log CAMBIO_ESTADO solo si cambia.</summary>
    [HttpPatch("{id:int}/estado")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ClasificadorPracticaDto>> ActualizarEstado(
        int id, [FromBody] ActualizarEstadoClasificadorDto dto)
    {
        var c = await db.ClasificadoresPractica.FindAsync(id);
        if (c is null)
            return NotFound(new { mensaje = $"No se encontró el clasificador con ID {id}." });

        var antActivo = c.Activo;

        // Solo actualizar si realmente cambió
        if (c.Activo == dto.Activo)
            return Ok(MapearDto(c));

        c.Activo    = dto.Activo;
        c.UpdatedAt = DateTime.UtcNow;
        c.UpdatedBy = UsuarioId;

        await db.SaveChangesAsync();

        db.ClasificadoresPracticaAuditLog.Add(new ClasificadorPracticaAuditLog
        {
            ClasificadorPracticaId = c.Id,
            Accion          = "CAMBIO_ESTADO",
            FechaEvento     = DateTime.UtcNow,
            UsuarioId       = UsuarioId,
            UsuarioNombre   = UsuarioNombre,
            Origen          = "MANUAL",
            Nivel1Anterior  = c.Nivel1,
            Nivel2Anterior  = c.Nivel2,
            Nivel3Anterior  = c.Nivel3,
            ActivoAnterior  = antActivo,
            Nivel1Nuevo     = c.Nivel1,
            Nivel2Nuevo     = c.Nivel2,
            Nivel3Nuevo     = c.Nivel3,
            ActivoNuevo     = c.Activo,
        });
        await db.SaveChangesAsync();

        return Ok(MapearDto(c));
    }

    // ── GET /api/clasificador-practicas/{id}/auditoria ───────────
    /// <summary>Historial de auditoría de un clasificador específico.</summary>
    [HttpGet("{id:int}/auditoria")]
    public async Task<ActionResult<List<ClasificadorPracticaAuditLogDto>>> ObtenerAuditoriaPorId(int id)
    {
        var existe = await db.ClasificadoresPractica.AnyAsync(c => c.Id == id);
        if (!existe)
            return NotFound(new { mensaje = $"No se encontró el clasificador con ID {id}." });

        var logs = await db.ClasificadoresPracticaAuditLog
            .Include(l => l.ClasificadorPractica)
            .Where(l => l.ClasificadorPracticaId == id)
            .OrderByDescending(l => l.FechaEvento)
            .Select(l => MapearLogDto(l))
            .ToListAsync();

        return Ok(logs);
    }

    // ── GET /api/clasificador-practicas/auditoria ────────────────
    /// <summary>Auditoría global con filtros.</summary>
    [HttpGet("auditoria")]
    public async Task<ActionResult<List<ClasificadorPracticaAuditLogDto>>> ObtenerAuditoriaGlobal(
        [FromQuery] string? usuarioNombre,
        [FromQuery] string? accion,
        [FromQuery] string? fechaDesde,
        [FromQuery] string? fechaHasta,
        [FromQuery] int?    clasificadorId)
    {
        var query = db.ClasificadoresPracticaAuditLog
            .Include(l => l.ClasificadorPractica)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(usuarioNombre))
            query = query.Where(l => l.UsuarioNombre.ToLower().Contains(usuarioNombre.ToLower()));

        if (!string.IsNullOrWhiteSpace(accion))
            query = query.Where(l => l.Accion == accion);

        if (clasificadorId.HasValue)
            query = query.Where(l => l.ClasificadorPracticaId == clasificadorId.Value);

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

    // ── GET /api/clasificador-practicas/exportar ─────────────────
    /// <summary>Descarga la tabla completa como archivo Excel.</summary>
    [HttpGet("exportar")]
    public async Task<IActionResult> Exportar()
    {
        var clasificadores = await db.ClasificadoresPractica
            .OrderBy(c => c.Nivel1)
            .ThenBy(c => c.Nivel2)
            .ThenBy(c => c.Nivel3)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Clasificador de Prácticas");

        // Encabezados
        ws.Cell(1, 1).Value = "ID";
        ws.Cell(1, 2).Value = "Nivel 1";
        ws.Cell(1, 3).Value = "Nivel 2";
        ws.Cell(1, 4).Value = "Nivel 3";
        ws.Cell(1, 5).Value = "Estado";
        ws.Cell(1, 6).Value = "Creado";
        ws.Cell(1, 7).Value = "Modificado";

        // Estilo encabezado
        var header = ws.Range("A1:G1");
        header.Style.Font.Bold = true;
        header.Style.Fill.BackgroundColor = XLColor.FromHtml("#1e3a5f");
        header.Style.Font.FontColor = XLColor.White;

        // Datos
        for (int i = 0; i < clasificadores.Count; i++)
        {
            var c = clasificadores[i];
            ws.Cell(i + 2, 1).Value = c.Id;
            ws.Cell(i + 2, 2).Value = c.Nivel1;
            ws.Cell(i + 2, 3).Value = c.Nivel2;
            ws.Cell(i + 2, 4).Value = c.Nivel3;
            ws.Cell(i + 2, 5).Value = c.Activo ? "Activo" : "Inactivo";
            ws.Cell(i + 2, 6).Value = c.CreatedAt.ToString("yyyy-MM-dd HH:mm");
            ws.Cell(i + 2, 7).Value = c.UpdatedAt.ToString("yyyy-MM-dd HH:mm");
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        wb.SaveAs(stream);
        stream.Position = 0;

        return File(
            stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            $"clasificador-practicas-{DateTime.UtcNow:yyyyMMdd}.xlsx"
        );
    }

    // ── POST /api/clasificador-practicas/importar/preview ────────
    /// <summary>
    /// Recibe un archivo Excel y devuelve una previsualización comparativa
    /// entre los datos del archivo y los existentes en la base.
    /// </summary>
    [HttpPost("importar/preview")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ClasificadorPracticaImportPreviewDto>> ImportarPreview(IFormFile archivo)
    {
        if (archivo == null || archivo.Length == 0)
            return BadRequest(new { mensaje = "Debe adjuntar un archivo Excel." });

        var filas = LeerExcel(archivo);
        if (filas.Count == 0)
            return BadRequest(new { mensaje = "El archivo no contiene filas de datos válidas." });

        // Cargar todos los existentes para el matching (pequeño volumen esperado)
        var existentes = await db.ClasificadoresPractica.ToListAsync();

        var transactionId = Guid.NewGuid();
        var preview = new ClasificadorPracticaImportPreviewDto
        {
            TransactionId = transactionId,
            Filas = filas.Select(f =>
            {
                // Matching: primero por ID si viene informado, luego por clave compuesta N1+N2+N3
                ClasificadorPractica? ex = null;
                if (f.Id.HasValue)
                    ex = existentes.FirstOrDefault(e => e.Id == f.Id.Value);

                if (ex == null)
                    ex = existentes.FirstOrDefault(e =>
                        e.Nivel1.ToLower() == f.Nivel1.Trim().ToLower() &&
                        e.Nivel2.ToLower() == f.Nivel2.Trim().ToLower() &&
                        e.Nivel3.ToLower() == f.Nivel3.Trim().ToLower());

                return new ClasificadorPracticaImportPreviewRowDto
                {
                    Nivel1Import   = f.Nivel1.Trim(),
                    Nivel2Import   = f.Nivel2.Trim(),
                    Nivel3Import   = f.Nivel3.Trim(),
                    ActivoImport   = f.Activo,
                    IdExistente    = ex?.Id,
                    ActivoActual   = ex?.Activo,
                    EsNueva        = ex == null,
                    HayDiferencia  = ex != null && ex.Activo != f.Activo,
                };
            }).ToList()
        };

        return Ok(preview);
    }

    // ── POST /api/clasificador-practicas/importar/confirmar ──────
    /// <summary>
    /// Confirma la importación previamente previsualizada.
    /// Inserta o actualiza cada fila y genera logs de auditoría con el transaction_id.
    /// </summary>
    [HttpPost("importar/confirmar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult> ImportarConfirmar([FromBody] ConfirmarClasificadorImportacionDto dto)
    {
        if (dto.Filas == null || dto.Filas.Count == 0)
            return BadRequest(new { mensaje = "No hay filas para importar." });

        var ahora = DateTime.UtcNow;
        int creadas = 0, actualizadas = 0;

        foreach (var fila in dto.Filas)
        {
            if (string.IsNullOrWhiteSpace(fila.Nivel1) ||
                string.IsNullOrWhiteSpace(fila.Nivel2) ||
                string.IsNullOrWhiteSpace(fila.Nivel3))
                continue;

            // Matching: primero por ID si viene informado, luego por clave compuesta N1+N2+N3
            ClasificadorPractica? existente = null;
            if (fila.Id.HasValue)
                existente = await db.ClasificadoresPractica
                    .FirstOrDefaultAsync(c => c.Id == fila.Id.Value);

            if (existente == null)
                existente = await db.ClasificadoresPractica
                    .FirstOrDefaultAsync(c =>
                        c.Nivel1.ToLower() == fila.Nivel1.Trim().ToLower() &&
                        c.Nivel2.ToLower() == fila.Nivel2.Trim().ToLower() &&
                        c.Nivel3.ToLower() == fila.Nivel3.Trim().ToLower());

            if (existente == null)
            {
                // Nueva
                var nuevo = new ClasificadorPractica
                {
                    Nivel1    = fila.Nivel1.Trim(),
                    Nivel2    = fila.Nivel2.Trim(),
                    Nivel3    = fila.Nivel3.Trim(),
                    Activo    = fila.Activo,
                    CreatedAt = ahora,
                    UpdatedAt = ahora,
                    CreatedBy = UsuarioId,
                    UpdatedBy = UsuarioId,
                };
                db.ClasificadoresPractica.Add(nuevo);
                await db.SaveChangesAsync();

                db.ClasificadoresPracticaAuditLog.Add(new ClasificadorPracticaAuditLog
                {
                    ClasificadorPracticaId = nuevo.Id,
                    Accion        = "ALTA",
                    FechaEvento   = ahora,
                    UsuarioId     = UsuarioId,
                    UsuarioNombre = UsuarioNombre,
                    Origen        = "IMPORTACION",
                    TransactionId = dto.TransactionId,
                    Nivel1Nuevo   = nuevo.Nivel1,
                    Nivel2Nuevo   = nuevo.Nivel2,
                    Nivel3Nuevo   = nuevo.Nivel3,
                    ActivoNuevo   = nuevo.Activo,
                    DatosNuevos   = JsonSerializer.Serialize(fila),
                });
                creadas++;
            }
            else
            {
                // Actualizar (la clave ya existe — registra como IMPORTACION)
                var antNivel1 = existente.Nivel1;
                var antNivel2 = existente.Nivel2;
                var antNivel3 = existente.Nivel3;
                var antActivo = existente.Activo;

                existente.Activo    = fila.Activo;
                existente.UpdatedAt = ahora;
                existente.UpdatedBy = UsuarioId;

                await db.SaveChangesAsync();

                db.ClasificadoresPracticaAuditLog.Add(new ClasificadorPracticaAuditLog
                {
                    ClasificadorPracticaId = existente.Id,
                    Accion          = "IMPORTACION",
                    FechaEvento     = ahora,
                    UsuarioId       = UsuarioId,
                    UsuarioNombre   = UsuarioNombre,
                    Origen          = "IMPORTACION",
                    TransactionId   = dto.TransactionId,
                    Nivel1Anterior  = antNivel1,
                    Nivel2Anterior  = antNivel2,
                    Nivel3Anterior  = antNivel3,
                    ActivoAnterior  = antActivo,
                    Nivel1Nuevo     = existente.Nivel1,
                    Nivel2Nuevo     = existente.Nivel2,
                    Nivel3Nuevo     = existente.Nivel3,
                    ActivoNuevo     = existente.Activo,
                    DatosAnteriores = JsonSerializer.Serialize(new { Nivel1 = antNivel1, Nivel2 = antNivel2, Nivel3 = antNivel3, Activo = antActivo }),
                    DatosNuevos     = JsonSerializer.Serialize(fila),
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

    private static string? ValidarDto(CrearEditarClasificadorPracticaDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Nivel1))
            return "El campo Nivel 1 es obligatorio.";
        if (dto.Nivel1.Length > 150)
            return "Nivel 1 no puede superar 150 caracteres.";
        if (string.IsNullOrWhiteSpace(dto.Nivel2))
            return "El campo Nivel 2 es obligatorio.";
        if (dto.Nivel2.Length > 150)
            return "Nivel 2 no puede superar 150 caracteres.";
        if (string.IsNullOrWhiteSpace(dto.Nivel3))
            return "El campo Nivel 3 es obligatorio.";
        if (dto.Nivel3.Length > 150)
            return "Nivel 3 no puede superar 150 caracteres.";
        return null;
    }

    private async Task<bool> ValidarUnicidad(string nivel1, string nivel2, string nivel3) =>
        await db.ClasificadoresPractica.AnyAsync(c =>
            c.Nivel1.ToLower() == nivel1.Trim().ToLower() &&
            c.Nivel2.ToLower() == nivel2.Trim().ToLower() &&
            c.Nivel3.ToLower() == nivel3.Trim().ToLower());

    private static List<ClasificadorPracticaImportRowDto> LeerExcel(IFormFile archivo)
    {
        var filas = new List<ClasificadorPracticaImportRowDto>();
        using var stream = archivo.OpenReadStream();
        using var wb     = new XLWorkbook(stream);
        var ws = wb.Worksheets.First();

        // Formato de columnas (igual al exportador):
        //   A = ID (opcional, int) | B = Nivel1 | C = Nivel2 | D = Nivel3 | E = Estado
        //
        // El archivo puede tener filas decorativas arriba (título, instrucciones, leyenda, encabezados).
        // Se busca la fila donde la columna B contiene "Nivel 1" o "Nivel1" (insensible a mayúsculas)
        // para determinar desde dónde empiezan los datos reales.
        var lastRow = ws.LastRowUsed()?.RowNumber() ?? 1;

        // 1) Detectar la fila de encabezado buscando "nivel 1" en col B (máximo las primeras 20 filas)
        int firstDataRow = 2; // default: si no encuentra encabezado, arranca desde fila 2
        for (int r = 1; r <= Math.Min(20, lastRow); r++)
        {
            var headerCell = ws.Cell(r, 2).GetString().Trim().ToLowerInvariant()
                              .Replace(" ", "");   // normaliza "Nivel 1" y "Nivel1"
            if (headerCell == "nivel1")
            {
                firstDataRow = r + 1;
                break;
            }
        }

        // 2) Leer filas de datos
        for (int r = firstDataRow; r <= lastRow; r++)
        {
            var n1 = ws.Cell(r, 2).GetString().Trim();
            var n2 = ws.Cell(r, 3).GetString().Trim();
            var n3 = ws.Cell(r, 4).GetString().Trim();
            if (string.IsNullOrWhiteSpace(n1) && string.IsNullOrWhiteSpace(n2) && string.IsNullOrWhiteSpace(n3))
                continue;

            // Col A: ID — entero opcional (vacío = nuevo registro)
            int? id = null;
            var idRaw = ws.Cell(r, 1).GetString().Trim();
            if (int.TryParse(idRaw, out var idParsed) && idParsed > 0)
                id = idParsed;

            // Col E: Estado — acepta ACTIVO/INACTIVO/SI/NO/TRUE/FALSE; default = true
            var estadoRaw = ws.Cell(r, 5).GetString().Trim().ToUpperInvariant();
            var activo = estadoRaw is not ("INACTIVO" or "NO" or "FALSE" or "0");

            filas.Add(new ClasificadorPracticaImportRowDto
            {
                Id     = id,
                Nivel1 = n1,
                Nivel2 = n2,
                Nivel3 = n3,
                Activo = activo,
            });
        }
        return filas;
    }

    private static ClasificadorPracticaDto MapearDto(ClasificadorPractica c) => new()
    {
        Id        = c.Id,
        Nivel1    = c.Nivel1,
        Nivel2    = c.Nivel2,
        Nivel3    = c.Nivel3,
        Activo    = c.Activo,
        Estado    = c.Activo ? "Activo" : "Inactivo",
        CreatedAt = c.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UpdatedAt = c.UpdatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        CreatedBy = c.CreatedBy,
        UpdatedBy = c.UpdatedBy,
    };

    private static ClasificadorPracticaAuditLogDto MapearLogDto(ClasificadorPracticaAuditLog l) => new()
    {
        Id                     = l.Id,
        ClasificadorPracticaId = l.ClasificadorPracticaId,
        Nivel1Clasificador     = l.ClasificadorPractica?.Nivel1,
        Nivel2Clasificador     = l.ClasificadorPractica?.Nivel2,
        Nivel3Clasificador     = l.ClasificadorPractica?.Nivel3,
        Accion                 = l.Accion,
        FechaEvento            = l.FechaEvento.ToString("yyyy-MM-ddTHH:mm:ssZ"),
        UsuarioId              = l.UsuarioId,
        UsuarioNombre          = l.UsuarioNombre,
        Origen                 = l.Origen,
        TransactionId          = l.TransactionId,
        Nivel1Anterior         = l.Nivel1Anterior,
        Nivel2Anterior         = l.Nivel2Anterior,
        Nivel3Anterior         = l.Nivel3Anterior,
        ActivoAnterior         = l.ActivoAnterior,
        Nivel1Nuevo            = l.Nivel1Nuevo,
        Nivel2Nuevo            = l.Nivel2Nuevo,
        Nivel3Nuevo            = l.Nivel3Nuevo,
        ActivoNuevo            = l.ActivoNuevo,
        DatosAnteriores        = l.DatosAnteriores,
        DatosNuevos            = l.DatosNuevos,
    };
}
