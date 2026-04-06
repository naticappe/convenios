-- ============================================================
-- CARGA INICIAL: UnidadArancel
-- Usuario: ncappellini
-- Origen:  IMPORTACION (primera carga)
-- Fecha:   ejecutar en tiempo real → usa NOW()
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 0. Resolución del usuario ncappellini
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_usuario_id   BIGINT;
    v_usuario_nom  VARCHAR(120);
    v_txid         UUID := gen_random_uuid();
    v_ahora        TIMESTAMPTZ := NOW();
    v_desde        DATE := '2026-01-01';
    v_hasta        DATE := '9999-12-31';
BEGIN

    -- Busca el usuario por email
    SELECT "Id",
           TRIM("Nombre" || ' ' || "Apellido")
    INTO   v_usuario_id, v_usuario_nom
    FROM   "Usuarios"
    WHERE  "Email" LIKE '%ncappellini%'
    LIMIT  1;

    -- Si no se encontró, usa valores nulos con nombre literal
    IF v_usuario_id IS NULL THEN
        v_usuario_nom := 'ncappellini';
    END IF;

    RAISE NOTICE 'Usuario: % (ID: %) | Transaction: %', v_usuario_nom, v_usuario_id, v_txid;

    -- ────────────────────────────────────────────────────────
    -- 1. INSERT unidades arancel con IDs explícitos
    --    (OVERRIDING SYSTEM VALUE permite forzar el ID
    --     en columnas identity de PostgreSQL)
    -- ────────────────────────────────────────────────────────
    INSERT INTO "UnidadesArancel"
        ("Id","Nombre","VigenciaDesde","VigenciaHasta","Activo",
         "CreatedAt","CreatedBy","UpdatedAt","UpdatedBy")
    OVERRIDING SYSTEM VALUE
    VALUES
        ( 32, 'PAMI - Quirúrgica',                  v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 34, 'PAMI - Clínica',                     v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 36, 'PAMI - HHAPyB',                      v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 38, 'PAMI - Imágenes',                    v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 39, 'PAMI - Sanatorial',                  v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 42, 'Sin Valor',                          v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 44, 'PAMI - Imágenes (Niv. III)',         v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 48, 'PAMI - Medicina Nuclear',            v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 49, 'PAMI - Terapia Radiante',            v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (280, 'PAMI UNIDAD DIALITICA',              v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (281, 'PAMI - Quirúrgica Modulada (III)',   v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (302, 'PAMI - Oftalmológica',               v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (303, 'PAMI - Transplante',                 v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (304, 'PAMI - CLINICA MODULADA (II)',       v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (305, 'PAMI - Quirúrgica Modulada (II)',    v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (314, 'PAMI- SALUD MENTAL',                 v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  9, 'Honorario Bioquímico',               v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (290, 'Bioquimico',                         v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  6, 'Gasto Bioquímico',                   v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 11, 'Galeno TAC',                         v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  1, 'Galeno',                             v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  3, 'Otros Gastos',                       v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  2, 'Gasto Quirúrgico',                   v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  7, 'Gasto Radiológico',                  v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        (  8, 'Sanatorial Pensión',                 v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 12, 'Gasto TAC',                          v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 13, 'Galeno Radiológico',                 v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id),
        ( 53, 'Galeno Quirúrgico',                  v_desde, v_hasta, TRUE, v_ahora, v_usuario_id, v_ahora, v_usuario_id)
    ON CONFLICT ("Id") DO NOTHING;  -- evita errores si algún ID ya existe

    -- ────────────────────────────────────────────────────────
    -- 2. Actualizar el sequence para que futuros inserts
    --    no colisionen con los IDs insertados manualmente
    -- ────────────────────────────────────────────────────────
    PERFORM setval(
        pg_get_serial_sequence('"UnidadesArancel"', 'Id'),
        GREATEST((SELECT MAX("Id") FROM "UnidadesArancel"), 314) + 1,
        FALSE  -- FALSE = próximo valor será ese número (no el siguiente)
    );

    RAISE NOTICE 'Sequence actualizada a %', GREATEST((SELECT MAX("Id") FROM "UnidadesArancel"), 314) + 1;

    -- ────────────────────────────────────────────────────────
    -- 3. INSERT audit_log → una entrada por cada registro
    --    accion = ALTA, origen = IMPORTACION
    -- ────────────────────────────────────────────────────────
    INSERT INTO "UnidadesArancelAuditLog"
        ("UnidadArancelId","Accion","FechaEvento","UsuarioId","UsuarioNombre",
         "Origen","TransactionId",
         "NombreAnterior","VigenciaDesdeAnterior","VigenciaHastaAnterior","ActivoAnterior",
         "NombreNuevo",  "VigenciaDesdeNuevo",   "VigenciaHastaNuevo",   "ActivoNuevo",
         "DatosAnteriores","DatosNuevos")
    SELECT
        ua."Id",
        'ALTA',
        v_ahora,
        v_usuario_id,
        v_usuario_nom,
        'IMPORTACION',
        v_txid,
        NULL, NULL, NULL, NULL,        -- sin valores anteriores (es alta)
        ua."Nombre",
        ua."VigenciaDesde",
        ua."VigenciaHasta",
        ua."Activo",
        NULL,                          -- datos_anteriores = null
        json_build_object(
            'nombre',        ua."Nombre",
            'vigenciaDesde', ua."VigenciaDesde",
            'vigenciaHasta', ua."VigenciaHasta",
            'activo',        ua."Activo"
        )::text
    FROM "UnidadesArancel" ua
    WHERE ua."Id" IN (
         1,  2,  3,  6,  7,  8,  9, 11, 12, 13,
        32, 34, 36, 38, 39, 42, 44, 48, 49, 53,
       280,281,290,302,303,304,305,314
    );

    RAISE NOTICE '% registros insertados en UnidadesArancel.', 28;
    RAISE NOTICE '% entradas de auditoría creadas. Transaction ID: %',
                 (SELECT COUNT(*) FROM "UnidadesArancelAuditLog" WHERE "TransactionId" = v_txid),
                 v_txid;

END $$;

COMMIT;

-- ────────────────────────────────────────────────────────────
-- Verificación final
-- ────────────────────────────────────────────────────────────
SELECT ua."Id",
       ua."Nombre",
       ua."VigenciaDesde",
       ua."VigenciaHasta",
       ua."Activo",
       ua."CreatedAt",
       al."Accion",
       al."Origen",
       al."TransactionId"
FROM   "UnidadesArancel" ua
JOIN   "UnidadesArancelAuditLog" al ON al."UnidadArancelId" = ua."Id"
ORDER  BY ua."Id";
