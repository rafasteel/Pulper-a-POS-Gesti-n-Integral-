-- ==============================================================================
-- SCRIPT DE MIGRACIÓN: ADAPTACIÓN SAAS & ROLES (EJECUTAR EN SUPABASE SQL EDITOR)
-- Si ya creaste las tablas anteriores, ejecuta este script para actualizarlas a SaaS
-- ==============================================================================

-- 1. Agregar campos de suscripción a la tabla de negocios
ALTER TABLE negocios 
ADD COLUMN IF NOT EXISTS estado_suscripcion TEXT NOT NULL DEFAULT 'prueba' CHECK (estado_suscripcion IN ('activa', 'suspendida', 'prueba', 'vencida')),
ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'pro', 'empresarial')),
ADD COLUMN IF NOT EXISTS precio_mensual NUMERIC(10, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS limite_sucursales INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS limite_usuarios INT DEFAULT 3;

-- 2. Permitir negocio_id nulo para Super Admin en usuarios_perfiles
ALTER TABLE usuarios_perfiles 
ALTER COLUMN negocio_id DROP NOT NULL;

-- 3. Registrar el rol superadmin
INSERT INTO roles (codigo, nombre, descripcion, nivel_jerarquia) VALUES
('superadmin', 'Super Administrador (SaaS Vendor)', 'Control total sobre todos los clientes, suscripciones y configuración de la plataforma SaaS', 1000)
ON CONFLICT (codigo) DO NOTHING;

-- 4. Funciones auxiliares de RLS
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT r.codigo = 'superadmin' 
         FROM usuarios_perfiles u 
         JOIN roles r ON r.id = u.rol_id 
         WHERE u.id = auth.uid() LIMIT 1),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_my_negocio_activo()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT estado_suscripcion IN ('activa', 'prueba') 
         FROM negocios 
         WHERE id = get_my_negocio_id()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Actualizar políticas RLS de ventas para bloquear registro en mora
DROP POLICY IF EXISTS "Tenant insert para ventas (Activas o Superadmin)" ON ventas;
CREATE POLICY "Tenant insert para ventas (Activas o Superadmin)"
ON ventas FOR INSERT
WITH CHECK (is_superadmin() OR (negocio_id = get_my_negocio_id() AND is_my_negocio_activo()));
