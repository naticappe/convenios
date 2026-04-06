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
public class NormasOperativasController(ApplicationDbContext db) : ControllerBase
{
    // ── Helper: projection a DTO ──────────────────────────────────────────

    private static NormaOperativaDto ToDto(NormaOperativa n) => new()
    {
        Id                           = n.Id,
        ObraSocialId                 = n.ObraSocialId,
        ObraSocialNombre             = n.ObraSocial?.Nombre,
        NombreOs                     = n.NombreOs,
        CodigoOs                     = n.CodigoOs,
        LinkDrive                    = n.LinkDrive,
        Coseguros                    = n.Coseguros,
        TipoOrden                    = OpcionDto(n.TipoOrden),
        VigenciaOrden                = OpcionDto(n.VigenciaOrden),
        FechaCalculoVigencia         = OpcionDto(n.FechaCalculoVigencia),
        AceptaPedidoDigitalPreimpreso= n.AceptaPedidoDigitalPreimpreso,
        AceptaPedidoFirmaDigital     = n.AceptaPedidoFirmaDigital,
        RequiereAutorizacionExpresa  = n.RequiereAutorizacionExpresa,
        AceptaRpDigital              = n.AceptaRpDigital,
        TipoAutorizacion             = n.TipoAutorizacion,
        FormatoAutorizacion          = n.FormatoAutorizacion,
        AceptaFotocopiaRp            = n.AceptaFotocopiaRp,
        CarnetDiscapacidadOncologico = n.CarnetDiscapacidadOncologico,
        PaginaObraSocial             = n.PaginaObraSocial,
        Usuario                      = n.Usuario,
        Contrasena                   = n.Contrasena,
        LinkInstructivo              = n.LinkInstructivo,
        FechaAutorizacion            = n.FechaAutorizacion,
        MedicoNoAparece              = n.MedicoNoAparece,
        EfectorImagen                = OpcionDto(n.EfectorImagen),
        EfectorConsultas             = OpcionDto(n.EfectorConsultas),
        EfectorOftalmologia          = OpcionDto(n.EfectorOftalmologia),
        EfectorOtras                 = OpcionDto(n.EfectorOtras),
        EfectorNoAparece             = n.EfectorNoAparece,
        Anestesias                   = n.Anestesias,
        AnatomiaPatologica           = n.AnatomiaPatologica,
        Cirugia                      = n.Cirugia,
        EstudiosValorCero            = OpcionDto(n.EstudiosValorCero),
        ObservacionesAutorizaciones  = n.ObservacionesAutorizaciones,
        HorarioObraSocial            = n.HorarioObraSocial,
        FechaFacturacion             = OpcionDto(n.FechaFacturacion),
        Documentacion                = OpcionDto(n.Documentacion),
        ModoCierre                   = OpcionDto(n.ModoCierre),
        CopiasFacturas               = OpcionDto(n.CopiasFacturas),
        DireccionEntrega             = OpcionDto(n.DireccionEntrega),
        ContactoFacturacion          = OpcionDto(n.ContactoFacturacion),
        SoporteMagnetico             = n.SoporteMagnetico,
        LibreDeDeuda                 = n.LibreDeDeuda,
        TroquelContrastes            = n.TroquelContrastes,
        LaboratorioFactura           = OpcionDto(n.LaboratorioFactura),
        InformacionAdicional         = n.InformacionAdicional,
        FechaCreacion                = n.FechaCreacion,
        FechaUltimaModificacion      = n.FechaUltimaModificacion,
        CreadoPor                    = n.CreadoPor,
        ModificadoPor                = n.ModificadoPor,
    };

    private static NormaOpOpcionDto? OpcionDto(NormaOpOpcion? op) =>
        op == null ? null : new() { Id = op.Id, Descripcion = op.Descripcion, Categoria = op.Categoria, Orden = op.Orden };

    private IQueryable<NormaOperativa> QueryConIncludes() =>
        db.NormasOperativas
            .Include(n => n.ObraSocial)
            .Include(n => n.TipoOrden)
            .Include(n => n.VigenciaOrden)
            .Include(n => n.FechaCalculoVigencia)
            .Include(n => n.EfectorImagen)
            .Include(n => n.EfectorConsultas)
            .Include(n => n.EfectorOftalmologia)
            .Include(n => n.EfectorOtras)
            .Include(n => n.EstudiosValorCero)
            .Include(n => n.FechaFacturacion)
            .Include(n => n.Documentacion)
            .Include(n => n.ModoCierre)
            .Include(n => n.CopiasFacturas)
            .Include(n => n.DireccionEntrega)
            .Include(n => n.ContactoFacturacion)
            .Include(n => n.LaboratorioFactura);

    // ── GET /api/normasoperativas ─────────────────────────────────────────
    [HttpGet]
    public async Task<ActionResult<List<NormaOperativaDto>>> ObtenerTodas(
        [FromQuery] int? obraSocialId,
        [FromQuery] string? buscar)
    {
        var q = QueryConIncludes().AsQueryable();

        if (obraSocialId.HasValue)
            q = q.Where(n => n.ObraSocialId == obraSocialId.Value);

        if (!string.IsNullOrWhiteSpace(buscar))
        {
            var lower = buscar.ToLower();
            q = q.Where(n => n.NombreOs.ToLower().Contains(lower) ||
                              (n.CodigoOs != null && n.CodigoOs.ToString()!.Contains(lower)));
        }

        var lista = await q.OrderBy(n => n.NombreOs).ToListAsync();
        return Ok(lista.Select(ToDto));
    }

    // ── GET /api/normasoperativas/{id} ────────────────────────────────────
    [HttpGet("{id:int}")]
    public async Task<ActionResult<NormaOperativaDto>> ObtenerPorId(int id)
    {
        var n = await QueryConIncludes().FirstOrDefaultAsync(x => x.Id == id);
        if (n == null) return NotFound();
        return Ok(ToDto(n));
    }

    // ── GET /api/normasoperativas/por-obra-social/{obraSocialId} ─────────
    [HttpGet("por-obra-social/{obraSocialId:int}")]
    public async Task<ActionResult<NormaOperativaDto?>> ObtenerPorObraSocial(int obraSocialId)
    {
        // 1) Buscar por FK directa
        var n = await QueryConIncludes().FirstOrDefaultAsync(x => x.ObraSocialId == obraSocialId);
        if (n != null) return Ok(ToDto(n));

        // 2) Fallback: buscar por CodigoOs coincidente con el Codigo de la ObraSocial
        var os = await db.ObrasSociales.FindAsync(obraSocialId);
        if (os != null)
        {
            n = await QueryConIncludes().FirstOrDefaultAsync(x => x.CodigoOs == os.Codigo);
            if (n != null)
            {
                // Vincular para futuras búsquedas
                n.ObraSocialId = obraSocialId;
                await db.SaveChangesAsync();
                return Ok(ToDto(n));
            }
        }

        return Ok(null);
    }

    // ── GET /api/normasoperativas/por-codigo/{codigoOs} ──────────────────
    // Búsqueda directa CodigoOs == codigo: elimina la indirección por PK
    [HttpGet("por-codigo/{codigoOs:int}")]
    public async Task<ActionResult<NormaOperativaDto?>> ObtenerPorCodigoOs(
        int codigoOs,
        [FromQuery] int? obraSocialId)
    {
        var n = await QueryConIncludes().FirstOrDefaultAsync(x => x.CodigoOs == codigoOs);

        // Si nos mandaron el PK de la OS, vinculamos la FK para futuras búsquedas
        if (n != null && obraSocialId.HasValue && n.ObraSocialId == null)
        {
            n.ObraSocialId = obraSocialId.Value;
            await db.SaveChangesAsync();
        }

        return Ok(n != null ? ToDto(n) : null);
    }

    // ── GET /api/normasoperativas/opciones ────────────────────────────────
    /// <summary>Returns all lookup options grouped by category.</summary>
    [HttpGet("opciones")]
    public async Task<ActionResult<Dictionary<string, List<NormaOpOpcionDto>>>> ObtenerOpciones()
    {
        var opciones = await db.NormaOpOpciones
            .OrderBy(o => o.Categoria)
            .ThenBy(o => o.Orden)
            .ThenBy(o => o.Descripcion)
            .ToListAsync();

        var grouped = opciones
            .GroupBy(o => o.Categoria)
            .ToDictionary(
                g => g.Key,
                g => g.Select(o => new NormaOpOpcionDto
                {
                    Id          = o.Id,
                    Descripcion = o.Descripcion,
                    Categoria   = o.Categoria,
                    Orden       = o.Orden,
                }).ToList()
            );

        return Ok(grouped);
    }

    // ── POST /api/normasoperativas ────────────────────────────────────────
    [HttpPost]
    public async Task<ActionResult<NormaOperativaDto>> Crear(
        [FromBody] UpsertNormaOperativaDto dto,
        [FromQuery] string? usuarioNombre)
    {
        var norma = MapDtoToModel(new NormaOperativa(), dto);
        norma.FechaCreacion = DateTime.UtcNow;
        norma.CreadoPor     = usuarioNombre;

        db.NormasOperativas.Add(norma);
        await db.SaveChangesAsync();

        // reload with includes
        var created = await QueryConIncludes().FirstAsync(n => n.Id == norma.Id);
        return CreatedAtAction(nameof(ObtenerPorId), new { id = norma.Id }, ToDto(created));
    }

    // ── PUT /api/normasoperativas/{id} ────────────────────────────────────
    [HttpPut("{id:int}")]
    public async Task<ActionResult<NormaOperativaDto>> Actualizar(
        int id,
        [FromBody] UpsertNormaOperativaDto dto,
        [FromQuery] string? usuarioNombre)
    {
        var norma = await db.NormasOperativas.FindAsync(id);
        if (norma == null) return NotFound();

        // Save previous values for audit
        var anterior = ToDto(await QueryConIncludes().FirstAsync(n => n.Id == id));

        MapDtoToModel(norma, dto);
        norma.FechaUltimaModificacion = DateTime.UtcNow;
        norma.ModificadoPor           = usuarioNombre;

        await db.SaveChangesAsync();

        // Create audit log entries for changed fields
        var updated = await QueryConIncludes().FirstAsync(n => n.Id == id);
        var updatedDto = ToDto(updated);
        await RegistrarAuditDiff(id, anterior, updatedDto, usuarioNombre ?? "sistema");

        return Ok(updatedDto);
    }

    // ── DELETE /api/normasoperativas/{id} ─────────────────────────────────
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var norma = await db.NormasOperativas.FindAsync(id);
        if (norma == null) return NotFound();

        db.NormasOperativas.Remove(norma);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── GET /api/normasoperativas/{id}/auditlog ───────────────────────────
    [HttpGet("{id:int}/auditlog")]
    public async Task<ActionResult<List<NormaOpAuditLogDto>>> ObtenerAuditLog(int id)
    {
        var logs = await db.NormaOpAuditLogs
            .Where(l => l.NormaId == id)
            .OrderByDescending(l => l.FechaHora)
            .Select(l => new NormaOpAuditLogDto
            {
                Id             = l.Id,
                NormaId        = l.NormaId,
                Campo          = l.Campo,
                Seccion        = l.Seccion,
                ValorAnterior  = l.ValorAnterior,
                ValorNuevo     = l.ValorNuevo,
                UsuarioNombre  = l.UsuarioNombre,
                FechaHora      = l.FechaHora,
            })
            .ToListAsync();

        return Ok(logs);
    }

    // ── POST /api/normasoperativas/{id}/auditlog ──────────────────────────
    [HttpPost("{id:int}/auditlog")]
    public async Task<ActionResult> RegistrarAudit(int id, [FromBody] NormaOpAuditLogDto dto)
    {
        var log = new NormaOpAuditLog
        {
            NormaId       = id,
            Campo         = dto.Campo,
            Seccion       = dto.Seccion,
            ValorAnterior = dto.ValorAnterior,
            ValorNuevo    = dto.ValorNuevo,
            UsuarioNombre = dto.UsuarioNombre,
            FechaHora     = DateTime.UtcNow,
        };
        db.NormaOpAuditLogs.Add(log);
        await db.SaveChangesAsync();
        return Ok();
    }

    // ── PRIVATE HELPERS ───────────────────────────────────────────────────

    private static NormaOperativa MapDtoToModel(NormaOperativa target, UpsertNormaOperativaDto dto)
    {
        target.ObraSocialId                  = dto.ObraSocialId;
        target.NombreOs                      = dto.NombreOs;
        target.CodigoOs                      = dto.CodigoOs;
        target.LinkDrive                     = dto.LinkDrive;
        target.Coseguros                     = dto.Coseguros;
        target.TipoOrdenId                   = dto.TipoOrdenId;
        target.VigenciaOrdenId               = dto.VigenciaOrdenId;
        target.FechaCalculoVigenciaId        = dto.FechaCalculoVigenciaId;
        target.AceptaPedidoDigitalPreimpreso = dto.AceptaPedidoDigitalPreimpreso;
        target.AceptaPedidoFirmaDigital      = dto.AceptaPedidoFirmaDigital;
        target.RequiereAutorizacionExpresa   = dto.RequiereAutorizacionExpresa;
        target.AceptaRpDigital               = dto.AceptaRpDigital;
        target.TipoAutorizacion              = dto.TipoAutorizacion;
        target.FormatoAutorizacion           = dto.FormatoAutorizacion;
        target.AceptaFotocopiaRp             = dto.AceptaFotocopiaRp;
        target.CarnetDiscapacidadOncologico  = dto.CarnetDiscapacidadOncologico;
        target.PaginaObraSocial              = dto.PaginaObraSocial;
        target.Usuario                       = dto.Usuario;
        target.Contrasena                    = dto.Contrasena;
        target.LinkInstructivo               = dto.LinkInstructivo;
        target.FechaAutorizacion             = dto.FechaAutorizacion;
        target.MedicoNoAparece               = dto.MedicoNoAparece;
        target.EfectorImagenId               = dto.EfectorImagenId;
        target.EfectorConsultasId            = dto.EfectorConsultasId;
        target.EfectorOftalmologiaId         = dto.EfectorOftalmologiaId;
        target.EfectorOtrasId                = dto.EfectorOtrasId;
        target.EfectorNoAparece              = dto.EfectorNoAparece;
        target.Anestesias                    = dto.Anestesias;
        target.AnatomiaPatologica            = dto.AnatomiaPatologica;
        target.Cirugia                       = dto.Cirugia;
        target.EstudiosValorCeroId           = dto.EstudiosValorCeroId;
        target.ObservacionesAutorizaciones   = dto.ObservacionesAutorizaciones;
        target.HorarioObraSocial             = dto.HorarioObraSocial;
        target.FechaFacturacionId            = dto.FechaFacturacionId;
        target.DocumentacionId               = dto.DocumentacionId;
        target.ModoCierreId                  = dto.ModoCierreId;
        target.CopiasFacturasId              = dto.CopiasFacturasId;
        target.DireccionEntregaId            = dto.DireccionEntregaId;
        target.ContactoFacturacionId         = dto.ContactoFacturacionId;
        target.SoporteMagnetico              = dto.SoporteMagnetico;
        target.LibreDeDeuda                  = dto.LibreDeDeuda;
        target.TroquelContrastes             = dto.TroquelContrastes;
        target.LaboratorioFacturaId          = dto.LaboratorioFacturaId;
        target.InformacionAdicional          = dto.InformacionAdicional;
        return target;
    }

    private async Task RegistrarAuditDiff(
        int normaId,
        NormaOperativaDto anterior,
        NormaOperativaDto posterior,
        string usuarioNombre)
    {
        var logs = new List<NormaOpAuditLog>();

        void Check(string campo, string seccion, string? prev, string? next)
        {
            if (prev != next)
                logs.Add(new NormaOpAuditLog
                {
                    NormaId       = normaId,
                    Campo         = campo,
                    Seccion       = seccion,
                    ValorAnterior = prev,
                    ValorNuevo    = next,
                    UsuarioNombre = usuarioNombre,
                    FechaHora     = DateTime.UtcNow,
                });
        }

        // Identificación
        Check("NombreOs",   "Identificación",  anterior.NombreOs,   posterior.NombreOs);
        Check("CodigoOs",   "Identificación",  anterior.CodigoOs?.ToString(),  posterior.CodigoOs?.ToString());
        Check("LinkDrive",  "Identificación",  anterior.LinkDrive,  posterior.LinkDrive);

        // Coseguros y Autorización
        Check("Coseguros",                      "Coseguros/Autorización", anterior.Coseguros,                      posterior.Coseguros);
        Check("TipoOrden",                      "Coseguros/Autorización", anterior.TipoOrden?.Descripcion,         posterior.TipoOrden?.Descripcion);
        Check("VigenciaOrden",                  "Coseguros/Autorización", anterior.VigenciaOrden?.Descripcion,     posterior.VigenciaOrden?.Descripcion);
        Check("FechaCalculoVigencia",           "Coseguros/Autorización", anterior.FechaCalculoVigencia?.Descripcion, posterior.FechaCalculoVigencia?.Descripcion);
        Check("AceptaPedidoDigitalPreimpreso",  "Coseguros/Autorización", anterior.AceptaPedidoDigitalPreimpreso,  posterior.AceptaPedidoDigitalPreimpreso);
        Check("AceptaPedidoFirmaDigital",       "Coseguros/Autorización", anterior.AceptaPedidoFirmaDigital?.ToString(), posterior.AceptaPedidoFirmaDigital?.ToString());
        Check("RequiereAutorizacionExpresa",    "Coseguros/Autorización", anterior.RequiereAutorizacionExpresa,    posterior.RequiereAutorizacionExpresa);
        Check("AceptaRpDigital",                "Coseguros/Autorización", anterior.AceptaRpDigital,                posterior.AceptaRpDigital);
        Check("TipoAutorizacion",               "Coseguros/Autorización", anterior.TipoAutorizacion,               posterior.TipoAutorizacion);
        Check("FormatoAutorizacion",            "Coseguros/Autorización", anterior.FormatoAutorizacion,            posterior.FormatoAutorizacion);
        Check("AceptaFotocopiaRp",              "Coseguros/Autorización", anterior.AceptaFotocopiaRp,              posterior.AceptaFotocopiaRp);
        Check("CarnetDiscapacidadOncologico",   "Coseguros/Autorización", anterior.CarnetDiscapacidadOncologico,   posterior.CarnetDiscapacidadOncologico);
        Check("PaginaObraSocial",               "Coseguros/Autorización", anterior.PaginaObraSocial,               posterior.PaginaObraSocial);
        Check("Usuario",                        "Coseguros/Autorización", anterior.Usuario,                        posterior.Usuario);
        Check("Contrasena",                     "Coseguros/Autorización", anterior.Contrasena,                     posterior.Contrasena);
        Check("LinkInstructivo",                "Coseguros/Autorización", anterior.LinkInstructivo,                posterior.LinkInstructivo);
        Check("FechaAutorizacion",              "Coseguros/Autorización", anterior.FechaAutorizacion,              posterior.FechaAutorizacion);
        Check("MedicoNoAparece",                "Coseguros/Autorización", anterior.MedicoNoAparece,                posterior.MedicoNoAparece);

        // Efectores
        Check("EfectorImagen",        "Efectores", anterior.EfectorImagen?.Descripcion,       posterior.EfectorImagen?.Descripcion);
        Check("EfectorConsultas",     "Efectores", anterior.EfectorConsultas?.Descripcion,    posterior.EfectorConsultas?.Descripcion);
        Check("EfectorOftalmologia",  "Efectores", anterior.EfectorOftalmologia?.Descripcion, posterior.EfectorOftalmologia?.Descripcion);
        Check("EfectorOtras",         "Efectores", anterior.EfectorOtras?.Descripcion,        posterior.EfectorOtras?.Descripcion);
        Check("EfectorNoAparece",     "Efectores", anterior.EfectorNoAparece,                 posterior.EfectorNoAparece);

        // Prácticas Especiales
        Check("Anestesias",                  "Prácticas Especiales", anterior.Anestesias,                  posterior.Anestesias);
        Check("AnatomiaPatologica",          "Prácticas Especiales", anterior.AnatomiaPatologica,          posterior.AnatomiaPatologica);
        Check("Cirugia",                     "Prácticas Especiales", anterior.Cirugia,                     posterior.Cirugia);
        Check("EstudiosValorCero",           "Prácticas Especiales", anterior.EstudiosValorCero?.Descripcion, posterior.EstudiosValorCero?.Descripcion);
        Check("ObservacionesAutorizaciones", "Prácticas Especiales", anterior.ObservacionesAutorizaciones, posterior.ObservacionesAutorizaciones);
        Check("HorarioObraSocial",           "Prácticas Especiales", anterior.HorarioObraSocial,           posterior.HorarioObraSocial);

        // Facturación
        Check("FechaFacturacion",    "Facturación", anterior.FechaFacturacion?.Descripcion,   posterior.FechaFacturacion?.Descripcion);
        Check("Documentacion",       "Facturación", anterior.Documentacion?.Descripcion,      posterior.Documentacion?.Descripcion);
        Check("ModoCierre",          "Facturación", anterior.ModoCierre?.Descripcion,         posterior.ModoCierre?.Descripcion);
        Check("CopiasFacturas",      "Facturación", anterior.CopiasFacturas?.Descripcion,     posterior.CopiasFacturas?.Descripcion);
        Check("DireccionEntrega",    "Facturación", anterior.DireccionEntrega?.Descripcion,   posterior.DireccionEntrega?.Descripcion);
        Check("ContactoFacturacion", "Facturación", anterior.ContactoFacturacion?.Descripcion,posterior.ContactoFacturacion?.Descripcion);
        Check("SoporteMagnetico",    "Facturación", anterior.SoporteMagnetico?.ToString(),    posterior.SoporteMagnetico?.ToString());
        Check("LibreDeDeuda",        "Facturación", anterior.LibreDeDeuda?.ToString(),        posterior.LibreDeDeuda?.ToString());
        Check("TroquelContrastes",   "Facturación", anterior.TroquelContrastes?.ToString(),   posterior.TroquelContrastes?.ToString());
        Check("LaboratorioFactura",  "Facturación", anterior.LaboratorioFactura?.Descripcion, posterior.LaboratorioFactura?.Descripcion);

        // Información Adicional
        Check("InformacionAdicional", "Información Adicional", anterior.InformacionAdicional, posterior.InformacionAdicional);

        if (logs.Count > 0)
        {
            db.NormaOpAuditLogs.AddRange(logs);
            await db.SaveChangesAsync();
        }
    }
}
