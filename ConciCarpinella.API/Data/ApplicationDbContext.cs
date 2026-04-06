// ============================================================
// CONTEXTO DE BASE DE DATOS
// Esta clase es el "puente" entre el código C# y la base de datos PostgreSQL.
// Define todas las tablas y sus relaciones.
// ============================================================

using ConciCarpinella.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options)
{
    // ── Tablas de la base de datos ────────────────────────────────
    // Cada DbSet<T> corresponde a una tabla en PostgreSQL

    public DbSet<ObraSocial>            ObrasSociales         { get; set; }
    public DbSet<ContactoObraSocial>    ContactosObraSocial   { get; set; }
    public DbSet<VigenciaObraSocial>    VigenciasObraSocial   { get; set; }
    public DbSet<Plan>          Planes          { get; set; }
    public DbSet<VigenciaPlan>  VigenciasPlan   { get; set; }
    public DbSet<Practica>     Practicas       { get; set; }
    public DbSet<Valor>        Valores         { get; set; }
    public DbSet<ImportacionValores>     ImportacionesValores      { get; set; }
    public DbSet<ImportacionValoresItem> ImportacionesValoresItems { get; set; }
    public DbSet<Coseguro>     Coseguros       { get; set; }
    public DbSet<Autorizacion> Autorizaciones  { get; set; }
    public DbSet<Cobertura>    Coberturas      { get; set; }
    public DbSet<Traductor>    Traductores     { get; set; }
    public DbSet<Concepto>     Conceptos       { get; set; }
    public DbSet<Usuario>      Usuarios        { get; set; }
    public DbSet<NormaOpOpcion>      NormaOpOpciones         { get; set; }
    public DbSet<NormaOperativa>     NormasOperativas        { get; set; }
    public DbSet<NormaOpAuditLog>    NormaOpAuditLogs        { get; set; }

    // ── Módulo Unidad Arancel ─────────────────────────────────────
    public DbSet<UnidadArancel>         UnidadesArancel        { get; set; }
    public DbSet<UnidadArancelAuditLog> UnidadesArancelAuditLog { get; set; }

    // ── Módulo Nomenclador (maestro con vigencias y auditoría) ────
    public DbSet<NomencladorMaestro>         NomencladorMaestro        { get; set; }
    public DbSet<NomencladorMaestroAuditLog> NomencladorMaestroAuditLog { get; set; }

    // ── Módulo Concepto (maestro con vigencias y auditoría) ───────
    public DbSet<ConceptoMaestro>         ConceptoMaestro        { get; set; }
    public DbSet<ConceptoMaestroAuditLog> ConceptoMaestroAuditLog { get; set; }

    // ── Módulo Clasificador de Prácticas ──────────────────────────
    public DbSet<ClasificadorPractica>         ClasificadoresPractica        { get; set; }
    public DbSet<ClasificadorPracticaAuditLog> ClasificadoresPracticaAuditLog { get; set; }

    // ── Módulo Prácticas Médicas (nuevo) ──────────────────────────
    public DbSet<PracticaConceptoUnidad> PracticaConceptoUnidades { get; set; }
    public DbSet<PracticaAuditLog>       PracticaAuditLogs        { get; set; }

    // ── Configuración de relaciones y restricciones ───────────────
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── ObraSocial ───────────────────────────────────────────
        modelBuilder.Entity<ObraSocial>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Codigo).IsRequired();
            entity.Property(e => e.Sigla).HasMaxLength(20);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Cuit).HasMaxLength(20);
            // Índice único: no puede haber dos obras sociales con el mismo CUIT
            entity.HasIndex(e => e.Cuit).IsUnique().HasFilter("\"Cuit\" IS NOT NULL");
            // Índice único: código numérico no se repite
            entity.HasIndex(e => e.Codigo).IsUnique();
        });

        // ── ContactoObraSocial ───────────────────────────────────
        modelBuilder.Entity<ContactoObraSocial>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Descripcion).HasMaxLength(500);
            entity.Property(e => e.Telefono).HasMaxLength(50);
            entity.Property(e => e.Mail).HasMaxLength(150);

            entity.HasOne(e => e.ObraSocial)
                  .WithMany(o => o.Contactos)
                  .HasForeignKey(e => e.ObraSocialId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── VigenciaObraSocial ───────────────────────────────────
        modelBuilder.Entity<VigenciaObraSocial>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Estado)
                  .IsRequired()
                  .HasConversion<string>()   // guarda "Activa"/"Suspendida"/"Baja" en texto
                  .HasMaxLength(20);
            entity.Property(e => e.FechaDesde).IsRequired();
            entity.Property(e => e.Observaciones).HasMaxLength(500);

            entity.HasOne(e => e.ObraSocial)
                  .WithMany(o => o.Vigencias)
                  .HasForeignKey(e => e.ObraSocialId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Plan ─────────────────────────────────────────────────
        modelBuilder.Entity<Plan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Alias).HasMaxLength(200);
            entity.Property(e => e.TipoIva)
                  .IsRequired()
                  .HasConversion<string>()
                  .HasMaxLength(20);

            entity.HasOne(e => e.ObraSocial)
                  .WithMany(o => o.Planes)
                  .HasForeignKey(e => e.ObraSocialId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── VigenciaPlan ─────────────────────────────────────────
        modelBuilder.Entity<VigenciaPlan>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Estado)
                  .IsRequired()
                  .HasConversion<string>()
                  .HasMaxLength(20);
            entity.Property(e => e.FechaDesde).IsRequired();
            entity.Property(e => e.Observaciones).HasMaxLength(500);

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Vigencias)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Practica ─────────────────────────────────────────────
        modelBuilder.Entity<Practica>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Codigo).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(300);
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasOne(e => e.NomencladorMaestro)
                  .WithMany()
                  .HasForeignKey(e => e.NomencladorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.ClasificadorPractica)
                  .WithMany()
                  .HasForeignKey(e => e.ClasificadorPracticaId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Clave única: (NomencladorId, Codigo)
            entity.HasIndex(e => new { e.NomencladorId, e.Codigo }).IsUnique();
        });

        // ── PracticaConceptoUnidad ────────────────────────────────
        modelBuilder.Entity<PracticaConceptoUnidad>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Unidades).HasPrecision(10, 4).IsRequired();
            entity.Property(e => e.Cantidad).HasPrecision(10, 4).IsRequired();
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasOne(e => e.Practica)
                  .WithMany(p => p.ConceptoUnidades)
                  .HasForeignKey(e => e.PracticaId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ConceptoMaestro)
                  .WithMany()
                  .HasForeignKey(e => e.ConceptoMaestroId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UnidadArancel)
                  .WithMany()
                  .HasForeignKey(e => e.UnidadArancelId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Unicidad: una práctica no puede tener el mismo concepto activo dos veces
            // (implementada por lógica de negocio al validar en el controller)
            entity.HasIndex(e => new { e.PracticaId, e.ConceptoMaestroId });
        });

        // ── PracticaAuditLog ──────────────────────────────────────
        modelBuilder.Entity<PracticaAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Accion).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Entidad).IsRequired().HasMaxLength(30);
            entity.Property(e => e.FechaEvento).IsRequired();
            entity.Property(e => e.UsuarioNombre).HasMaxLength(120);
            entity.Property(e => e.Origen).IsRequired().HasMaxLength(30);
            entity.HasIndex(e => e.PracticaId);

            entity.HasOne(e => e.Practica)
                  .WithMany(p => p.AuditLogs)
                  .HasForeignKey(e => e.PracticaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Valor ────────────────────────────────────────────────
        modelBuilder.Entity<Valor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ValorUnitario).HasPrecision(12, 2);

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Valores)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Practica)
                  .WithMany(p => p.Valores)
                  .HasForeignKey(e => e.PracticaId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Coseguro ─────────────────────────────────────────────
        modelBuilder.Entity<Coseguro>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Porcentaje).HasPrecision(5, 2);
            entity.Property(e => e.ValorFijo).HasPrecision(12, 2);

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Coseguros)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── Autorizacion ─────────────────────────────────────────
        modelBuilder.Entity<Autorizacion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Numero).IsRequired().HasMaxLength(50);
            entity.Property(e => e.NombrePaciente).IsRequired().HasMaxLength(100);
            entity.Property(e => e.ApellidoPaciente).IsRequired().HasMaxLength(100);
            entity.HasIndex(e => e.Numero).IsUnique();

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Autorizaciones)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Practica)
                  .WithMany(p => p.Autorizaciones)
                  .HasForeignKey(e => e.PracticaId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ── Cobertura ────────────────────────────────────────────
        modelBuilder.Entity<Cobertura>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.PorcentajeCubierto).HasPrecision(5, 2);

            entity.HasOne(e => e.Plan)
                  .WithMany(p => p.Coberturas)
                  .HasForeignKey(e => e.PlanId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Practica)
                  .WithMany(p => p.Coberturas)
                  .HasForeignKey(e => e.PracticaId)
                  .OnDelete(DeleteBehavior.Restrict);

            // No puede haber dos coberturas para el mismo plan y práctica
            entity.HasIndex(e => new { e.PlanId, e.PracticaId }).IsUnique();
        });

        // ── Traductor ────────────────────────────────────────────
        modelBuilder.Entity<Traductor>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CodigoOrigen).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CodigoDestino).IsRequired().HasMaxLength(50);

            // Para evitar referencias circulares en PostgreSQL, usamos NoAction
            entity.HasOne(e => e.NomencladorOrigen)
                  .WithMany()
                  .HasForeignKey(e => e.NomencladorOrigenId)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.NomencladorDestino)
                  .WithMany()
                  .HasForeignKey(e => e.NomencladorDestinoId)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // ── Usuario ──────────────────────────────────────────────
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Apellido).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(200);
            // El email es único: no pueden existir dos usuarios con el mismo email
            entity.HasIndex(e => e.Email).IsUnique();
        });

        // ── Concepto ─────────────────────────────────────────────
        modelBuilder.Entity<Concepto>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
        });

        // ── ImportacionValores ────────────────────────────────────
        modelBuilder.Entity<ImportacionValores>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NombreArchivo).IsRequired().HasMaxLength(500);
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.Observaciones).HasMaxLength(500);

            entity.HasOne(e => e.ObraSocial)
                  .WithMany()
                  .HasForeignKey(e => e.ObraSocialId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ImportacionValoresItem ────────────────────────────────
        modelBuilder.Entity<ImportacionValoresItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.CodigoPractica).IsRequired().HasMaxLength(50);
            entity.Property(e => e.CodigoExterno).HasMaxLength(50);
            entity.Property(e => e.DescripcionPractica).IsRequired().HasMaxLength(500);
            entity.Property(e => e.ValorImportado).HasPrecision(12, 2);
            entity.Property(e => e.Observaciones).HasMaxLength(500);

            entity.HasOne(e => e.Importacion)
                  .WithMany(i => i.Items)
                  .HasForeignKey(e => e.ImportacionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── NormaOpOpcion ─────────────────────────────────────────
        modelBuilder.Entity<NormaOpOpcion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Categoria).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Descripcion).IsRequired();
            entity.Property(e => e.Orden).IsRequired();
            entity.HasIndex(e => e.Categoria);
        });

        // ── NormaOperativa ────────────────────────────────────────
        modelBuilder.Entity<NormaOperativa>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NombreOs).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CodigoOs);
            entity.Property(e => e.FechaCreacion).IsRequired();

            // Foreign key to ObraSocial
            entity.HasOne(e => e.ObraSocial)
                  .WithMany()
                  .HasForeignKey(e => e.ObraSocialId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Many nullable foreign keys to NormaOpOpcion (no cascade delete)
            entity.HasOne(e => e.TipoOrden)
                  .WithMany()
                  .HasForeignKey(e => e.TipoOrdenId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.VigenciaOrden)
                  .WithMany()
                  .HasForeignKey(e => e.VigenciaOrdenId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.FechaCalculoVigencia)
                  .WithMany()
                  .HasForeignKey(e => e.FechaCalculoVigenciaId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.EfectorImagen)
                  .WithMany()
                  .HasForeignKey(e => e.EfectorImagenId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.EfectorConsultas)
                  .WithMany()
                  .HasForeignKey(e => e.EfectorConsultasId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.EfectorOftalmologia)
                  .WithMany()
                  .HasForeignKey(e => e.EfectorOftalmologiaId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.EfectorOtras)
                  .WithMany()
                  .HasForeignKey(e => e.EfectorOtrasId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.EstudiosValorCero)
                  .WithMany()
                  .HasForeignKey(e => e.EstudiosValorCeroId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.FechaFacturacion)
                  .WithMany()
                  .HasForeignKey(e => e.FechaFacturacionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Documentacion)
                  .WithMany()
                  .HasForeignKey(e => e.DocumentacionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ModoCierre)
                  .WithMany()
                  .HasForeignKey(e => e.ModoCierreId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CopiasFacturas)
                  .WithMany()
                  .HasForeignKey(e => e.CopiasFacturasId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.DireccionEntrega)
                  .WithMany()
                  .HasForeignKey(e => e.DireccionEntregaId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ContactoFacturacion)
                  .WithMany()
                  .HasForeignKey(e => e.ContactoFacturacionId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.LaboratorioFactura)
                  .WithMany()
                  .HasForeignKey(e => e.LaboratorioFacturaId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // ── NormaOpAuditLog ───────────────────────────────────────
        modelBuilder.Entity<NormaOpAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.NormaId).IsRequired();
            entity.Property(e => e.Campo).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Seccion).IsRequired().HasMaxLength(100);
            entity.Property(e => e.UsuarioNombre).IsRequired().HasMaxLength(200);
            entity.Property(e => e.FechaHora).IsRequired();
            entity.HasIndex(e => e.NormaId);
        });

        // ── UnidadArancel ─────────────────────────────────────────
        modelBuilder.Entity<UnidadArancel>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(150);
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.VigenciaHasta).IsRequired();
            entity.Property(e => e.Activo).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            // Nombre único en todo el maestro
            entity.HasIndex(e => e.Nombre).IsUnique();
        });

        // ── UnidadArancelAuditLog ─────────────────────────────────
        modelBuilder.Entity<UnidadArancelAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Accion).IsRequired().HasMaxLength(30);
            entity.Property(e => e.FechaEvento).IsRequired();
            entity.Property(e => e.UsuarioNombre).HasMaxLength(120);
            entity.Property(e => e.Origen).IsRequired().HasMaxLength(30);
            entity.Property(e => e.NombreAnterior).HasMaxLength(150);
            entity.Property(e => e.NombreNuevo).HasMaxLength(150);
            entity.HasIndex(e => e.UnidadArancelId);

            entity.HasOne(e => e.UnidadArancel)
                  .WithMany(u => u.AuditLogs)
                  .HasForeignKey(e => e.UnidadArancelId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── NomencladorMaestro ────────────────────────────────────
        modelBuilder.Entity<NomencladorMaestro>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(150);
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.VigenciaHasta).IsRequired();
            entity.Property(e => e.Activo).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.HasIndex(e => e.Nombre).IsUnique();
        });

        // ── NomencladorMaestroAuditLog ────────────────────────────
        modelBuilder.Entity<NomencladorMaestroAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Accion).IsRequired().HasMaxLength(30);
            entity.Property(e => e.FechaEvento).IsRequired();
            entity.Property(e => e.UsuarioNombre).HasMaxLength(120);
            entity.Property(e => e.Origen).IsRequired().HasMaxLength(30);
            entity.Property(e => e.NombreAnterior).HasMaxLength(150);
            entity.Property(e => e.NombreNuevo).HasMaxLength(150);
            entity.HasIndex(e => e.NomencladorMaestroId);

            entity.HasOne(e => e.NomencladorMaestro)
                  .WithMany(n => n.AuditLogs)
                  .HasForeignKey(e => e.NomencladorMaestroId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ConceptoMaestro ───────────────────────────────────────
        modelBuilder.Entity<ConceptoMaestro>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nombre).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Sigla).IsRequired().HasMaxLength(10);
            entity.Property(e => e.VigenciaDesde).IsRequired();
            entity.Property(e => e.VigenciaHasta).IsRequired();
            entity.Property(e => e.Activo).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            entity.HasIndex(e => e.Nombre).IsUnique();
            entity.HasIndex(e => e.Sigla).IsUnique();
        });

        // ── ConceptoMaestroAuditLog ───────────────────────────────
        modelBuilder.Entity<ConceptoMaestroAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Accion).IsRequired().HasMaxLength(30);
            entity.Property(e => e.FechaEvento).IsRequired();
            entity.Property(e => e.UsuarioNombre).HasMaxLength(120);
            entity.Property(e => e.Origen).IsRequired().HasMaxLength(30);
            entity.Property(e => e.NombreAnterior).HasMaxLength(150);
            entity.Property(e => e.NombreNuevo).HasMaxLength(150);
            entity.Property(e => e.SiglaAnterior).HasMaxLength(10);
            entity.Property(e => e.SiglaNueva).HasMaxLength(10);
            entity.HasIndex(e => e.ConceptoMaestroId);

            entity.HasOne(e => e.ConceptoMaestro)
                  .WithMany(c => c.AuditLogs)
                  .HasForeignKey(e => e.ConceptoMaestroId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // ── ClasificadorPractica ──────────────────────────────────
        modelBuilder.Entity<ClasificadorPractica>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Nivel1).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Nivel2).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Nivel3).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Activo).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
            // Clave única compuesta: (Nivel1, Nivel2, Nivel3)
            entity.HasIndex(e => new { e.Nivel1, e.Nivel2, e.Nivel3 }).IsUnique();
        });

        // ── ClasificadorPracticaAuditLog ──────────────────────────
        modelBuilder.Entity<ClasificadorPracticaAuditLog>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Accion).IsRequired().HasMaxLength(30);
            entity.Property(e => e.FechaEvento).IsRequired();
            entity.Property(e => e.UsuarioNombre).HasMaxLength(120);
            entity.Property(e => e.Origen).IsRequired().HasMaxLength(30);
            entity.Property(e => e.Nivel1Anterior).HasMaxLength(150);
            entity.Property(e => e.Nivel2Anterior).HasMaxLength(150);
            entity.Property(e => e.Nivel3Anterior).HasMaxLength(150);
            entity.Property(e => e.Nivel1Nuevo).HasMaxLength(150);
            entity.Property(e => e.Nivel2Nuevo).HasMaxLength(150);
            entity.Property(e => e.Nivel3Nuevo).HasMaxLength(150);
            entity.HasIndex(e => e.ClasificadorPracticaId);

            entity.HasOne(e => e.ClasificadorPractica)
                  .WithMany(c => c.AuditLogs)
                  .HasForeignKey(e => e.ClasificadorPracticaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
