// ============================================================
// DTOs — Módulo de Valores
// ============================================================
namespace ConciCarpinella.API.DTOs;

// ── Configuración ETL ─────────────────────────────────────────
// El cliente puede enviar una config personalizada para ajustar
// el parseo sin tocar código. Todos los campos tienen defaults.

public class EtlConfigDto
{
    /// <summary>Fila 1-based que contiene los encabezados de columna.</summary>
    public int    FilaEncabezado   { get; set; } = 6;
    /// <summary>Primera fila 1-based con datos reales.</summary>
    public int    FilasDatoDesde   { get; set; } = 7;
    /// <summary>Columna 1-based del código externo (proveedor).</summary>
    public int    ColCodigoExterno { get; set; } = 1;
    /// <summary>Columna 1-based del código interno.</summary>
    public int    ColCodigo        { get; set; } = 2;
    /// <summary>Columna 1-based de la descripción.</summary>
    public int    ColDescripcion   { get; set; } = 3;
    /// <summary>"ultima" = última col antes de OBSERVACIONES. O número de col 1-based.</summary>
    public string ColValor         { get; set; } = "ultima";
    /// <summary>Prefijo en el encabezado que indica columna de fin (no es valor).</summary>
    public string PrefijoColfin    { get; set; } = "OBSERV";
    /// <summary>Omitir filas donde ColCodigo está vacío (son títulos de sección).</summary>
    public bool   OmitirCodVacio   { get; set; } = true;
    /// <summary>Omitir filas donde el valor importado es 0.</summary>
    public bool   OmitirValorCero  { get; set; } = false;
}

// ── Parsear (ETL) ─────────────────────────────────────────────

public class ParsearImportacionResponseDto
{
    public int              ImportacionId  { get; set; }
    public string           NombreArchivo  { get; set; } = "";
    /// <summary>Pasos del ETL en lenguaje natural.</summary>
    public List<string>     EtlPasos       { get; set; } = new();
    public int              TotalFilas     { get; set; }
    public int              FilasValidas   { get; set; }
    public int              FilasIgnoradas { get; set; }
    public List<ParsearItemDto>      Items          { get; set; } = new();
    public List<FilaExcluidaDto>     FilasExcluidas { get; set; } = new();
    /// <summary>Config ETL efectivamente usada (para mostrar en editor).</summary>
    public EtlConfigDto     ConfigUsada    { get; set; } = new();
}

/// <summary>Fila que fue filtrada durante el ETL, con su contenido y motivo.</summary>
public class FilaExcluidaDto
{
    public int    NumeroFila  { get; set; }
    public string Codigo      { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public string Motivo      { get; set; } = "";
}

public class ParsearItemDto
{
    public string   CodigoPractica        { get; set; } = "";
    public string   CodigoExterno         { get; set; } = "";
    public string   Descripcion           { get; set; } = "";
    public decimal  ValorNuevo            { get; set; }
    public decimal? ValorActual           { get; set; }
    public decimal? Diferencia            { get; set; }
    public decimal? DiferenciaPorcentaje  { get; set; }
    /// <summary>igual | mayor | menor | nuevo</summary>
    public string   Estado                { get; set; } = "nuevo";
}

// ── Aplicar ───────────────────────────────────────────────────

public class AplicarImportacionDto
{
    public int    ImportacionId      { get; set; }
    public string? NomencladorNombre { get; set; }
    public List<PlanAjusteDto> Planes { get; set; } = new();
}

public class PlanAjusteDto
{
    public int     PlanId             { get; set; }
    /// <summary>Ajuste %: positivo = por encima del valor de referencia, negativo = por debajo.</summary>
    public decimal AjustePorcentaje   { get; set; } = 0;
}

public class AplicarImportacionResponseDto
{
    public int          CodigosAplicados   { get; set; }
    public int          PlanesActualizados { get; set; }
    public int          PracticasCreadas   { get; set; }
    public List<string> Advertencias       { get; set; } = new();
}

// ── Listado de importaciones ──────────────────────────────────

public class ImportacionListDto
{
    public int      Id            { get; set; }
    public string   NombreArchivo { get; set; } = "";
    public DateOnly VigenciaDesde { get; set; }
    public DateTime FechaCreacion { get; set; }
    public bool     Aplicada      { get; set; }
    public int      CantidadItems { get; set; }
}

// ── Matriz ────────────────────────────────────────────────────

public class MatrizResponseDto
{
    public List<PlanSimpleDto>     Planes    { get; set; } = new();
    public List<MatrizPracticaDto> Practicas { get; set; } = new();
}

public class PlanSimpleDto
{
    public int    Id     { get; set; }
    public string Nombre { get; set; } = "";
}

public class MatrizPracticaDto
{
    public string         Codigo         { get; set; } = "";
    public string         Descripcion    { get; set; } = "";
    public List<decimal?> Valores        { get; set; } = new();
    public int            CantidadPlanes { get; set; }
}

// ── Historial ─────────────────────────────────────────────────

public class HistorialResponseDto
{
    // Períodos (fechas de vigencia) — una columna por cada uno
    public List<DateOnly>         Periodos { get; set; } = new();
    // Un grupo por plan, cada uno con sus prácticas y variaciones promedio
    public List<HistorialPlanDto> Planes   { get; set; } = new();
}

public class HistorialPlanDto
{
    public int    Id     { get; set; }
    public string Nombre { get; set; } = "";
    // Variación promedio de todos los códigos vs período anterior (null en el primero)
    public List<decimal?>            VariacionPromedio { get; set; } = new();
    public List<HistorialPracticaDto> Practicas        { get; set; } = new();
}

public class HistorialPracticaDto
{
    public string         Codigo      { get; set; } = "";
    public string         Descripcion { get; set; } = "";
    public List<decimal?> Historial   { get; set; } = new();
}
