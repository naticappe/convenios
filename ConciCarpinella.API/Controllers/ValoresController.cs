// ============================================================
// VALORES CONTROLLER
// Endpoints originales (CRUD básico) + Importador ETL + Matriz + Historial
// ============================================================
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
public class ValoresController(ApplicationDbContext db) : ControllerBase
{
    // ── CRUD básico ───────────────────────────────────────────────

    [HttpGet]
    public async Task<ActionResult<List<ValorDto>>> ObtenerTodos(
        [FromQuery] int? planId,
        [FromQuery] int? practicaId)
    {
        var query = db.Valores
            .Include(v => v.Plan).ThenInclude(p => p.ObraSocial)
            .Include(v => v.Practica)
            .AsQueryable();

        if (planId.HasValue)     query = query.Where(v => v.PlanId == planId.Value);
        if (practicaId.HasValue) query = query.Where(v => v.PracticaId == practicaId.Value);

        var lista = await query
            .OrderBy(v => v.Plan.ObraSocial.Nombre)
            .ThenBy(v => v.Plan.Nombre)
            .ThenBy(v => v.Practica.Codigo)
            .Select(v => new ValorDto
            {
                Id             = v.Id,
                ValorUnitario  = v.ValorUnitario,
                VigenciaDesde  = v.VigenciaDesde,
                VigenciaHasta  = v.VigenciaHasta,
                Unidad         = v.Unidad,
                Observaciones  = v.Observaciones,
                PlanId         = v.PlanId,
                Plan           = v.Plan.Nombre,
                PracticaId     = v.PracticaId,
                Practica       = v.Practica.Nombre,
                CodigoPractica = v.Practica.Codigo
            })
            .ToListAsync();

        return Ok(lista);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ValorDto>> ObtenerPorId(int id)
    {
        var v = await db.Valores
            .Include(x => x.Plan).ThenInclude(p => p.ObraSocial)
            .Include(x => x.Practica)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (v is null) return NotFound();

        return Ok(new ValorDto
        {
            Id = v.Id, ValorUnitario = v.ValorUnitario, VigenciaDesde = v.VigenciaDesde,
            VigenciaHasta = v.VigenciaHasta, Unidad = v.Unidad, Observaciones = v.Observaciones,
            PlanId = v.PlanId, Plan = v.Plan.Nombre, PracticaId = v.PracticaId,
            Practica = v.Practica.Nombre, CodigoPractica = v.Practica.Codigo
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ValorDto>> Crear([FromBody] CrearEditarValorDto dto)
    {
        var nuevo = new Valor
        {
            ValorUnitario  = dto.ValorUnitario,
            VigenciaDesde  = dto.VigenciaDesde,
            VigenciaHasta  = dto.VigenciaHasta,
            Unidad         = dto.Unidad,
            Observaciones  = dto.Observaciones,
            PlanId         = dto.PlanId,
            PracticaId     = dto.PracticaId,
            FechaCreacion  = DateTime.UtcNow
        };
        db.Valores.Add(nuevo);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(ObtenerPorId), new { id = nuevo.Id }, new ValorDto { Id = nuevo.Id, ValorUnitario = nuevo.ValorUnitario });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ValorDto>> Actualizar(int id, [FromBody] CrearEditarValorDto dto)
    {
        var v = await db.Valores.FindAsync(id);
        if (v is null) return NotFound();
        v.ValorUnitario = dto.ValorUnitario;
        v.VigenciaDesde = dto.VigenciaDesde;
        v.VigenciaHasta = dto.VigenciaHasta;
        v.Unidad        = dto.Unidad;
        v.Observaciones = dto.Observaciones;
        v.PlanId        = dto.PlanId;
        v.PracticaId    = dto.PracticaId;
        await db.SaveChangesAsync();
        return Ok(new ValorDto { Id = v.Id, ValorUnitario = v.ValorUnitario, PlanId = v.PlanId });
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var v = await db.Valores.FindAsync(id);
        if (v is null) return NotFound();
        db.Valores.Remove(v);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── PARSEAR (ETL) ─────────────────────────────────────────────
    // Recibe un archivo Excel del proveedor + config ETL opcional.
    // Devuelve comparación de valores nuevos vs anteriores y filas excluidas.
    // Guarda la importación como borrador (Aplicada = false).
    [HttpPost("parsear/{obraSocialId:int}")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<ParsearImportacionResponseDto>> Parsear(
        int obraSocialId,
        IFormFile archivo,
        [FromForm] string vigenciaDesde,
        [FromForm] string? etlConfigJson = null)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest(new { mensaje = "No se recibió ningún archivo." });

        if (!DateOnly.TryParse(vigenciaDesde, out var fecha))
            return BadRequest(new { mensaje = "Fecha de vigencia inválida. Use formato YYYY-MM-DD." });

        var os = await db.ObrasSociales.FindAsync(obraSocialId);
        if (os is null) return NotFound(new { mensaje = "Obra social no encontrada." });

        // Deserializar config ETL o usar valores por defecto
        EtlConfigDto cfg;
        try
        {
            cfg = etlConfigJson != null
                ? System.Text.Json.JsonSerializer.Deserialize<EtlConfigDto>(
                    etlConfigJson,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                  ?? new EtlConfigDto()
                : new EtlConfigDto();
        }
        catch
        {
            return BadRequest(new { mensaje = "La configuración ETL no es un JSON válido." });
        }

        var pasos          = new List<string>();
        var items          = new List<ParsearItemDto>();
        var filasExcluidas = new List<FilaExcluidaDto>();
        int totalFilas     = 0;
        int filasIgnoradas = 0;

        try
        {
            using var ms = new MemoryStream();
            await archivo.CopyToAsync(ms);
            ms.Position = 0;

            using var wb = new XLWorkbook(ms);
            var ws = wb.Worksheets.First();

            int lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            int lastCol = ws.LastColumnUsed()?.ColumnNumber() ?? 0;
            totalFilas = lastRow;

            pasos.Add($"Archivo recibido: {archivo.FileName} ({lastRow} filas, {lastCol} columnas)");
            pasos.Add($"Se omitieron las primeras {cfg.FilaEncabezado - 1} filas de encabezado del proveedor");

            // Identificar columna de valor usando config ETL
            int    lastValueCol = cfg.ColDescripcion + 1;
            string colHeader    = "";

            if (cfg.ColValor == "ultima")
            {
                for (int c = lastCol; c > cfg.ColDescripcion; c--)
                {
                    var h = ws.Cell(cfg.FilaEncabezado, c).GetString().Trim();
                    if (!string.IsNullOrEmpty(h) && !h.ToUpper().StartsWith(cfg.PrefijoColfin.ToUpper()))
                    {
                        lastValueCol = c;
                        colHeader    = h;
                        break;
                    }
                }
            }
            else if (int.TryParse(cfg.ColValor, out int colManual))
            {
                lastValueCol = colManual;
                colHeader    = ws.Cell(cfg.FilaEncabezado, colManual).GetString().Trim();
            }

            pasos.Add($"Columna de valor seleccionada: {colHeader} (col {lastValueCol})");

            // Cargar últimos valores importados para comparación
            var ultimosImportados = await db.ImportacionesValoresItems
                .Include(i => i.Importacion)
                .Where(i => i.Importacion.ObraSocialId == obraSocialId && i.Importacion.Aplicada)
                .GroupBy(i => i.CodigoPractica)
                .Select(g => new
                {
                    Codigo = g.Key,
                    Valor  = g.OrderByDescending(i => i.Importacion.VigenciaDesde).First().ValorImportado
                })
                .ToDictionaryAsync(x => x.Codigo, x => x.Valor);

            // Procesar filas de datos según config
            for (int r = cfg.FilasDatoDesde; r <= lastRow; r++)
            {
                var codigo        = ws.Cell(r, cfg.ColCodigo).GetString().Trim();
                var descripcion   = ws.Cell(r, cfg.ColDescripcion).GetString().Trim();
                var codigoExterno = ws.Cell(r, cfg.ColCodigoExterno).GetString().Trim();

                // ── Filtro: código vacío (título de sección) ──────────
                if (cfg.OmitirCodVacio && string.IsNullOrEmpty(codigo))
                {
                    filasIgnoradas++;
                    // Capturar fila excluida con su contenido real
                    var contenidoVisible = !string.IsNullOrEmpty(descripcion) ? descripcion
                        : !string.IsNullOrEmpty(codigoExterno) ? codigoExterno
                        : ws.Cell(r, 1).GetString().Trim();
                    if (!string.IsNullOrEmpty(contenidoVisible))
                    {
                        filasExcluidas.Add(new FilaExcluidaDto
                        {
                            NumeroFila  = r,
                            Codigo      = codigoExterno,
                            Descripcion = contenidoVisible,
                            Motivo      = "Título de sección"
                        });
                    }
                    continue;
                }

                decimal valorNuevo = 0;
                var cell = ws.Cell(r, lastValueCol);
                if (!cell.IsEmpty())
                {
                    try
                    {
                        valorNuevo = cell.DataType == XLDataType.Number
                            ? (decimal)cell.GetDouble()
                            : ParseDecimal(cell.GetString());
                    }
                    catch { /* ignorar celdas con formato no reconocido */ }
                }

                // ── Filtro: valor cero (opcional) ────────────────────
                if (cfg.OmitirValorCero && valorNuevo == 0)
                {
                    filasIgnoradas++;
                    filasExcluidas.Add(new FilaExcluidaDto
                    {
                        NumeroFila  = r,
                        Codigo      = codigo,
                        Descripcion = descripcion,
                        Motivo      = "Valor cero"
                    });
                    continue;
                }

                var valorActual = ultimosImportados.TryGetValue(codigo, out var va) ? va : (decimal?)null;
                decimal? diferencia = valorActual.HasValue ? valorNuevo - valorActual.Value : null;
                decimal? diferPct   = valorActual.HasValue && valorActual.Value != 0
                    ? Math.Round(diferencia!.Value / valorActual.Value * 100, 2)
                    : null;

                string estado = valorActual is null         ? "nuevo"
                    : Math.Abs(diferencia!.Value) < 0.01m  ? "igual"
                    : diferencia.Value > 0                  ? "mayor" : "menor";

                items.Add(new ParsearItemDto
                {
                    CodigoPractica       = codigo,
                    CodigoExterno        = codigoExterno,
                    Descripcion          = descripcion,
                    ValorNuevo           = valorNuevo,
                    ValorActual          = valorActual,
                    Diferencia           = diferencia,
                    DiferenciaPorcentaje = diferPct,
                    Estado               = estado
                });
            }

            pasos.Add($"{items.Count} prácticas procesadas, {filasIgnoradas} filas omitidas");

            int cantNuevas = items.Count(i => i.Estado == "nuevo");
            int cantMayor  = items.Count(i => i.Estado == "mayor");
            int cantMenor  = items.Count(i => i.Estado == "menor");

            if (cantNuevas > 0)
                pasos.Add($"{cantNuevas} prácticas nuevas (se crearán al aplicar)");
            if (cantMayor > 0 || cantMenor > 0)
                pasos.Add($"Respecto a la última importación: {cantMayor} subieron, {cantMenor} bajaron");
        }
        catch (Exception ex)
        {
            return BadRequest(new { mensaje = $"Error al procesar el archivo: {ex.Message}" });
        }

        // Guardar como borrador
        var importacion = new ImportacionValores
        {
            ObraSocialId  = obraSocialId,
            NombreArchivo = archivo.FileName,
            VigenciaDesde = fecha,
            Items = items.Select(i => new ImportacionValoresItem
            {
                CodigoPractica      = i.CodigoPractica,
                CodigoExterno       = i.CodigoExterno,
                DescripcionPractica = i.Descripcion,
                ValorImportado      = i.ValorNuevo
            }).ToList()
        };
        db.ImportacionesValores.Add(importacion);
        await db.SaveChangesAsync();

        return Ok(new ParsearImportacionResponseDto
        {
            ImportacionId  = importacion.Id,
            NombreArchivo  = archivo.FileName,
            EtlPasos       = pasos,
            TotalFilas     = totalFilas,
            FilasValidas   = items.Count,
            FilasIgnoradas = filasIgnoradas,
            Items          = items,
            // Limitar a 500 filas excluidas en la respuesta para no saturar
            FilasExcluidas = filasExcluidas.Take(500).ToList(),
            ConfigUsada    = cfg
        });
    }

    // ── APLICAR ────────────────────────────────────────────────────
    // Toma la importación borrador y graba los nuevos Valores por plan,
    // cerrando los valores vigentes anteriores.
    [HttpPost("aplicar")]
    [Authorize(Roles = "Admin,DataEntry")]
    public async Task<ActionResult<AplicarImportacionResponseDto>> Aplicar([FromBody] AplicarImportacionDto dto)
    {
        var importacion = await db.ImportacionesValores
            .Include(i => i.Items)
            .Include(i => i.ObraSocial)
            .FirstOrDefaultAsync(i => i.Id == dto.ImportacionId);

        if (importacion is null)     return NotFound(new { mensaje = "Importación no encontrada." });
        if (importacion.Aplicada)    return BadRequest(new { mensaje = "Esta importación ya fue aplicada." });
        if (!dto.Planes.Any())       return BadRequest(new { mensaje = "Debe seleccionar al menos un plan." });

        int codigosAplicados = 0;
        int practicasCreadas = 0;
        var advertencias     = new List<string>();

        // Obtener o crear NomencladorMaestro para las prácticas nuevas
        var nombreNomenc = !string.IsNullOrWhiteSpace(dto.NomencladorNombre)
            ? dto.NomencladorNombre
            : $"Importación {importacion.ObraSocial.Nombre}";

        var nomenclador = await db.NomencladorMaestro.FirstOrDefaultAsync(n => n.Nombre == nombreNomenc);
        if (nomenclador is null)
        {
            var hoy = DateOnly.FromDateTime(DateTime.UtcNow);
            nomenclador = new NomencladorMaestro
            {
                Nombre        = nombreNomenc,
                VigenciaDesde = hoy,
                VigenciaHasta = new DateOnly(9999, 12, 31),
                Activo        = true,
                CreatedAt     = DateTime.UtcNow,
                UpdatedAt     = DateTime.UtcNow,
            };
            db.NomencladorMaestro.Add(nomenclador);
            await db.SaveChangesAsync();
        }

        // Pre-cargar prácticas existentes para evitar consultas repetidas
        var codigos        = importacion.Items.Select(i => i.CodigoPractica).Distinct().ToList();
        var practicasDict  = await db.Practicas
            .Where(p => codigos.Contains(p.Codigo))
            .ToDictionaryAsync(p => p.Codigo, p => p);

        foreach (var planAjuste in dto.Planes)
        {
            var plan = await db.Planes.FindAsync(planAjuste.PlanId);
            if (plan is null)
            {
                advertencias.Add($"Plan ID {planAjuste.PlanId} no encontrado, omitido.");
                continue;
            }
            if (plan.ObraSocialId != importacion.ObraSocialId)
            {
                advertencias.Add($"El plan '{plan.Nombre}' no pertenece a esta obra social, omitido.");
                continue;
            }

            foreach (var item in importacion.Items)
            {
                // Encontrar o crear práctica
                if (!practicasDict.TryGetValue(item.CodigoPractica, out var practica))
                {
                    practica = new Practica
                    {
                        Codigo        = item.CodigoPractica,
                        Nombre        = item.DescripcionPractica,
                        NomencladorId = nomenclador.Id,
                        VigenciaDesde = DateTime.UtcNow,
                        Activo        = true,
                        CreatedAt     = DateTime.UtcNow,
                        UpdatedAt     = DateTime.UtcNow
                    };
                    db.Practicas.Add(practica);
                    await db.SaveChangesAsync();
                    practicasDict[item.CodigoPractica] = practica;
                    practicasCreadas++;
                }

                // Cerrar valores vigentes para este plan + práctica
                var vigentes = await db.Valores
                    .Where(v => v.PlanId == plan.Id && v.PracticaId == practica.Id && v.VigenciaHasta == null)
                    .ToListAsync();
                foreach (var v in vigentes)
                    v.VigenciaHasta = importacion.VigenciaDesde.AddDays(-1);

                // Valor final con ajuste porcentual
                var valorFinal = planAjuste.AjustePorcentaje == 0
                    ? item.ValorImportado
                    : Math.Round(item.ValorImportado * (1 + planAjuste.AjustePorcentaje / 100m), 2);

                db.Valores.Add(new Valor
                {
                    PlanId        = plan.Id,
                    PracticaId    = practica.Id,
                    ValorUnitario = valorFinal,
                    VigenciaDesde = importacion.VigenciaDesde
                });
                codigosAplicados++;
            }

            await db.SaveChangesAsync();
        }

        importacion.Aplicada = true;
        await db.SaveChangesAsync();

        return Ok(new AplicarImportacionResponseDto
        {
            CodigosAplicados   = codigosAplicados,
            PlanesActualizados = dto.Planes.Count,
            PracticasCreadas   = practicasCreadas,
            Advertencias       = advertencias
        });
    }

    // ── LISTAR IMPORTACIONES ───────────────────────────────────────
    [HttpGet("importaciones/{obraSocialId:int}")]
    public async Task<ActionResult<List<ImportacionListDto>>> ListarImportaciones(int obraSocialId)
    {
        var lista = await db.ImportacionesValores
            .Where(i => i.ObraSocialId == obraSocialId)
            .OrderByDescending(i => i.FechaCreacion)
            .Select(i => new ImportacionListDto
            {
                Id            = i.Id,
                NombreArchivo = i.NombreArchivo,
                VigenciaDesde = i.VigenciaDesde,
                FechaCreacion = i.FechaCreacion,
                Aplicada      = i.Aplicada,
                CantidadItems = i.Items.Count()
            })
            .ToListAsync();

        return Ok(lista);
    }

    // ── MATRIZ: planes × prácticas con valores vigentes ───────────
    [HttpGet("matriz/{obraSocialId:int}")]
    public async Task<ActionResult<MatrizResponseDto>> ObtenerMatriz(int obraSocialId)
    {
        var planesConVig = await db.Planes
            .Include(p => p.Vigencias)
            .Where(p => p.ObraSocialId == obraSocialId)
            .OrderBy(p => p.Nombre)
            .ToListAsync();

        var planesActivos = planesConVig
            .Where(p => p.Vigencias
                .OrderByDescending(v => v.FechaDesde)
                .Select(v => v.Estado.ToString())
                .FirstOrDefault() != "Baja")
            .ToList();

        if (!planesActivos.Any())
            return Ok(new MatrizResponseDto());

        var planIds = planesActivos.Select(p => p.Id).ToList();

        var valores = await db.Valores
            .Include(v => v.Practica)
            .Where(v => planIds.Contains(v.PlanId) && v.VigenciaHasta == null)
            .ToListAsync();

        var codigosOrdenados = valores
            .Select(v => v.Practica.Codigo)
            .Distinct()
            .OrderBy(c => c)
            .ToList();

        var practicas = codigosOrdenados.Select(cod =>
        {
            var infoRef        = valores.First(v => v.Practica.Codigo == cod).Practica;
            var valoresPorPlan = planesActivos
                .Select(p => valores.FirstOrDefault(v => v.Practica.Codigo == cod && v.PlanId == p.Id)?.ValorUnitario)
                .ToList();

            return new MatrizPracticaDto
            {
                Codigo         = cod,
                Descripcion    = infoRef.Nombre,
                Valores        = valoresPorPlan,
                CantidadPlanes = valoresPorPlan.Count(v => v.HasValue)
            };
        }).ToList();

        return Ok(new MatrizResponseDto
        {
            Planes    = planesActivos.Select(p => new PlanSimpleDto { Id = p.Id, Nombre = p.Nombre }).ToList(),
            Practicas = practicas
        });
    }

    // ── HISTORIAL: variaciones por plan y período ─────────────────
    [HttpGet("historial/{obraSocialId:int}")]
    public async Task<ActionResult<HistorialResponseDto>> ObtenerHistorial(int obraSocialId)
    {
        // Últimos 8 períodos con valores para la OS (desde la tabla Valor)
        var periodos = await db.Valores
            .Where(v => v.Plan.ObraSocialId == obraSocialId)
            .Select(v => v.VigenciaDesde)
            .Distinct()
            .OrderByDescending(d => d)
            .Take(8)
            .ToListAsync();

        if (!periodos.Any())
            return Ok(new HistorialResponseDto());

        periodos = periodos.OrderBy(d => d).ToList();

        // Todos los valores de la OS en esos períodos
        var valores = await db.Valores
            .Include(v => v.Plan)
            .Include(v => v.Practica)
            .Where(v => v.Plan.ObraSocialId == obraSocialId
                     && periodos.Contains(v.VigenciaDesde))
            .ToListAsync();

        // Agrupar por plan → luego por práctica
        var planesDto = valores
            .GroupBy(v => v.Plan)
            .OrderBy(g => g.Key.Nombre)
            .Select(g =>
            {
                var codigos = g.Select(v => v.Practica.Codigo)
                               .Distinct().OrderBy(c => c).ToList();

                var practicas = codigos.Select(cod =>
                {
                    var hist = periodos
                        .Select(p => g.FirstOrDefault(v =>
                            v.Practica.Codigo == cod && v.VigenciaDesde == p)?.ValorUnitario)
                        .ToList();

                    var desc = g.First(v => v.Practica.Codigo == cod).Practica.Nombre;
                    return new HistorialPracticaDto { Codigo = cod, Descripcion = desc, Historial = hist };
                }).ToList();

                // Variación promedio del plan por período (null en el primero)
                var varPromedio = periodos.Select((_, i) =>
                {
                    if (i == 0) return (decimal?)null;
                    var deltas = practicas
                        .Select(pr =>
                        {
                            var prev = pr.Historial[i - 1];
                            var curr = pr.Historial[i];
                            if (prev == null || curr == null) return (decimal?)null;
                            return prev == 0 ? 0m : ((curr.Value - prev.Value) / prev.Value) * 100m;
                        })
                        .Where(d => d.HasValue)
                        .Select(d => d!.Value)
                        .ToList();

                    return deltas.Any() ? (decimal?)deltas.Average() : null;
                }).ToList();

                return new HistorialPlanDto
                {
                    Id                = g.Key.Id,
                    Nombre            = g.Key.Nombre,
                    VariacionPromedio = varPromedio,
                    Practicas         = practicas,
                };
            }).ToList();

        return Ok(new HistorialResponseDto { Periodos = periodos, Planes = planesDto });
    }

    // ── Helpers ────────────────────────────────────────────────────
    private static decimal ParseDecimal(string s)
    {
        var clean     = s.Trim().Replace("$", "").Replace(" ", "");
        int lastDot   = clean.LastIndexOf('.');
        int lastComma = clean.LastIndexOf(',');
        // Si la coma viene después del punto: formato argentino (punto=miles, coma=decimal)
        if (lastComma > lastDot)
            clean = clean.Replace(".", "").Replace(",", ".");
        else
            clean = clean.Replace(",", "");
        return decimal.TryParse(clean, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var r) ? r : 0;
    }
}
