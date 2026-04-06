// ============================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// Captura cualquier error no controlado del sistema y devuelve
// un mensaje de error claro en lugar de un error técnico.
// ============================================================

using System.Net;
using System.Text.Json;

namespace ConciCarpinella.API.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (InvalidOperationException ex)
        {
            // Error de regla de negocio (ej: email duplicado)
            logger.LogWarning("Error de validación: {Message}", ex.Message);
            await EscribirRespuestaErrorAsync(context, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            // Recurso no encontrado
            logger.LogWarning("Recurso no encontrado: {Message}", ex.Message);
            await EscribirRespuestaErrorAsync(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (UnauthorizedAccessException ex)
        {
            // Sin permisos
            logger.LogWarning("Acceso no autorizado: {Message}", ex.Message);
            await EscribirRespuestaErrorAsync(context, HttpStatusCode.Forbidden, ex.Message);
        }
        catch (Exception ex)
        {
            // Error inesperado del sistema
            logger.LogError(ex, "Error inesperado en el servidor");
            await EscribirRespuestaErrorAsync(
                context,
                HttpStatusCode.InternalServerError,
                "Ocurrió un error inesperado. Por favor contacte al administrador.");
        }
    }

    private static async Task EscribirRespuestaErrorAsync(
        HttpContext context, HttpStatusCode statusCode, string mensaje)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode  = (int)statusCode;

        var respuesta = new
        {
            status  = (int)statusCode,
            mensaje = mensaje,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(respuesta, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
