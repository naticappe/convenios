// ============================================================
// DATOS INICIALES DEL SISTEMA
// Este archivo crea los datos necesarios para que el sistema
// funcione desde el primer inicio (usuario admin, datos base).
// ============================================================

using ConciCarpinella.API.Models;
using Microsoft.EntityFrameworkCore;

namespace ConciCarpinella.API.Data;

public static class SeedData
{
    /// <summary>
    /// Inicializa la base de datos con datos esenciales si está vacía.
    /// Se ejecuta automáticamente cada vez que inicia la aplicación.
    /// </summary>
    public static async Task InicializarAsync(IServiceProvider servicios)
    {
        using var scope = servicios.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        // ── Crear usuario administrador inicial ───────────────────
        if (!await db.Usuarios.AnyAsync())
        {
            var adminInicial = new Usuario
            {
                Nombre       = "Administrador",
                Apellido     = "Sistema",
                Email        = "admin@concicarpinella.com",
                // Contraseña encriptada: "Admin123!" - cambiarla en producción
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Rol          = RolUsuario.Admin,
                Activo       = true,
                FechaCreacion = DateTime.UtcNow
            };

            db.Usuarios.Add(adminInicial);
            await db.SaveChangesAsync();

            Console.WriteLine("✅ Usuario administrador creado: admin@concicarpinella.com / Admin123!");
        }

        // ── Crear conceptos base ──────────────────────────────────
        if (!await db.Conceptos.AnyAsync())
        {
            var conceptos = new List<Concepto>
            {
                new() { Nombre = "Consulta Médica General",  Tipo = TipoConcepto.Ingreso, Activo = true },
                new() { Nombre = "Consulta Especialista",    Tipo = TipoConcepto.Ingreso, Activo = true },
                new() { Nombre = "Práctica de Laboratorio",  Tipo = TipoConcepto.Ingreso, Activo = true },
                new() { Nombre = "Práctica Radiológica",     Tipo = TipoConcepto.Ingreso, Activo = true },
                new() { Nombre = "Internación",              Tipo = TipoConcepto.Ingreso, Activo = true },
                new() { Nombre = "Débito por error",         Tipo = TipoConcepto.Egreso,  Activo = true },
                new() { Nombre = "Ajuste de liquidación",    Tipo = TipoConcepto.Ajuste,  Activo = true },
            };

            db.Conceptos.AddRange(conceptos);
            await db.SaveChangesAsync();

            Console.WriteLine("✅ Conceptos base creados.");
        }

        // ── Crear nomencladores maestro iniciales ────────────────────
        if (!await db.NomencladorMaestro.AnyAsync())
        {
            var vigDesde = new DateOnly(2024, 1, 1);
            var vigHasta = new DateOnly(9999, 12, 31);

            var nomencladores = new List<NomencladorMaestro>
            {
                new() { Nombre = "AME",  VigenciaDesde = vigDesde, VigenciaHasta = vigHasta, Activo = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Nombre = "AMIC", VigenciaDesde = vigDesde, VigenciaHasta = vigHasta, Activo = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Nombre = "PMO",  VigenciaDesde = vigDesde, VigenciaHasta = vigHasta, Activo = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
                new() { Nombre = "Local", VigenciaDesde = vigDesde, VigenciaHasta = vigHasta, Activo = true, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            };

            db.NomencladorMaestro.AddRange(nomencladores);
            await db.SaveChangesAsync();

            Console.WriteLine("✅ Nomencladores maestro iniciales creados (AME, AMIC, PMO, Local).");
        }

        // ── Crear normas operativas ──────────────────────────────────
        await NormasOperativasSeeder.SeedAsync(db);
        Console.WriteLine("✅ Normas operativas cargadas.");
    }
}
