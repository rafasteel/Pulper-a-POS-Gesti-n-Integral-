-- ==============================================================================
-- DATOS INICIALES ESTRUCTURALES Y POLÍTICAS RLS (PULPERÍA POS)
-- Archivo: supabase/seed_datos_iniciales.sql
-- Ejecuta este script en: Panel de Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. ASEGURAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. REGISTROS ESTRUCTURALES MÍNIMOS (NEGOCIO, SUCURSAL, CAJA REGISTRADORA)
-- ==============================================================================

-- 2.1. NEGOCIO PRINCIPAL
-- UUID predecible: 11111111-1111-1111-1111-111111111111
INSERT INTO public.negocios (
    id,
    nombre,
    nombre_comercial,
    identificacion_fiscal,
    moneda_simbolo,
    moneda_codigo,
    pais,
    timezone,
    telefono,
    whatsapp,
    email,
    direccion,
    mensaje_ticket,
    estado_suscripcion,
    fecha_vencimiento,
    plan,
    precio_mensual,
    limite_sucursales,
    limite_usuarios,
    activo
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Mi Pulpería Principal',
    'Mi Pulpería Principal - Mostrador',
    'J0310000123456',
    'C$',
    'NIO',
    'Nicaragua',
    'America/Managua',
    '+505 8899-7766',
    '50588997766',
    'contacto@mipulperia.com',
    'Barrio Central, De la Iglesia 2c. al Sur',
    '¡Gracias por su compra en su pulpería amiga!',
    'activa',
    '2028-12-31',
    'pro',
    25.00,
    3,
    10,
    true
)
ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    nombre_comercial = EXCLUDED.nombre_comercial,
    estado_suscripcion = 'activa',
    plan = 'pro',
    activo = true;

-- 2.2. SUCURSAL CENTRAL
-- UUID predecible: 11111111-1111-1111-1111-111111111112
INSERT INTO public.sucursales (
    id,
    negocio_id,
    codigo,
    nombre,
    direccion,
    telefono,
    es_matriz,
    activa
) VALUES (
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'SUC-01',
    'Sucursal Central',
    'Barrio Central, De la Iglesia 2c. al Sur',
    '+505 8899-7766',
    true,
    true
)
ON CONFLICT (negocio_id, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    activa = true;

-- 2.3. CAJA REGISTRADORA ACTIVA
-- UUID predecible: 11111111-1111-1111-1111-111111111115
INSERT INTO public.cajas (
    id,
    sucursal_id,
    nombre,
    codigo,
    activa
) VALUES (
    '11111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111112',
    'Caja 01 - Mostrador',
    'CAJA-01',
    true
)
ON CONFLICT (sucursal_id, codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    activa = true;

-- ==============================================================================
-- 3. MÉTODOS DE PAGO Y ROLES DEL SISTEMA (REQUERIDOS POR VENTAS Y CAJA)
-- ==============================================================================

INSERT INTO public.metodos_pago (codigo, nombre, requiere_referencia, activo) VALUES
('efectivo', 'Efectivo', false, true),
('tarjeta', 'Tarjeta de Débito / Crédito', true, true),
('transferencia', 'Transferencia Bancaria / Móvil', true, true),
('fiado', 'Crédito de Pulpería (Fiado)', false, true),
('mixto', 'Pago Mixto (Efectivo + Otro)', false, true)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.roles (codigo, nombre, descripcion, nivel_jerarquia) VALUES
('superadmin', 'Super Administrador (SaaS Vendor)', 'Control total sobre todos los clientes', 1000),
('propietario', 'Dueño / Propietario', 'Acceso total a finanzas e inventario', 100),
('administrador', 'Administrador de Tienda', 'Gestión de catálogo y reportes', 80),
('cajero', 'Cajero de Mostrador', 'Operación de POS y turnos de caja', 30),
('bodeguero', 'Bodeguero / Almacén', 'Control de existencias e inventario', 40),
('contador', 'Contador', 'Acceso a gastos y finanzas', 50)
ON CONFLICT (codigo) DO NOTHING;

-- ==============================================================================
-- 4. FLEXIBILIZACIÓN DE RESTRICCIONES PARA CAJEROS POR PIN (SIN AUTH.USERS FK)
-- ==============================================================================

ALTER TABLE IF EXISTS public.aperturas_caja ALTER COLUMN usuario_apertura_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.aperturas_caja DROP CONSTRAINT IF EXISTS aperturas_caja_usuario_apertura_id_fkey;

ALTER TABLE IF EXISTS public.movimientos_caja ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_usuario_id_fkey;

ALTER TABLE IF EXISTS public.cierres_caja ALTER COLUMN usuario_cierre_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.cierres_caja DROP CONSTRAINT IF EXISTS cierres_caja_usuario_cierre_id_fkey;

ALTER TABLE IF EXISTS public.gastos ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.gastos DROP CONSTRAINT IF EXISTS gastos_usuario_id_fkey;

ALTER TABLE IF EXISTS public.abonos_cuentas_por_cobrar ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.abonos_cuentas_por_cobrar DROP CONSTRAINT IF EXISTS abonos_cuentas_por_cobrar_usuario_id_fkey;

ALTER TABLE IF EXISTS public.ventas ALTER COLUMN cajero_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.ventas ALTER COLUMN apertura_caja_id DROP NOT NULL;

-- ==============================================================================
-- 5. POLÍTICAS ROW LEVEL SECURITY (RLS) PERMISIVAS PARA OPERACIÓN LOCAL Y ONLINE
-- ==============================================================================

-- Negocios
ALTER TABLE IF EXISTS public.negocios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select negocios" ON public.negocios;
DROP POLICY IF EXISTS "Permitir all negocios" ON public.negocios;
CREATE POLICY "Permitir select negocios" ON public.negocios FOR SELECT USING (true);
CREATE POLICY "Permitir all negocios" ON public.negocios FOR ALL USING (true) WITH CHECK (true);

-- Sucursales
ALTER TABLE IF EXISTS public.sucursales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select sucursales" ON public.sucursales;
DROP POLICY IF EXISTS "Permitir all sucursales" ON public.sucursales;
CREATE POLICY "Permitir select sucursales" ON public.sucursales FOR SELECT USING (true);
CREATE POLICY "Permitir all sucursales" ON public.sucursales FOR ALL USING (true) WITH CHECK (true);

-- Cajas
ALTER TABLE IF EXISTS public.cajas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select cajas" ON public.cajas;
DROP POLICY IF EXISTS "Permitir all cajas" ON public.cajas;
CREATE POLICY "Permitir select cajas" ON public.cajas FOR SELECT USING (true);
CREATE POLICY "Permitir all cajas" ON public.cajas FOR ALL USING (true) WITH CHECK (true);

-- Aperturas y Cierres de Caja
ALTER TABLE IF EXISTS public.aperturas_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en aperturas_caja" ON public.aperturas_caja;
CREATE POLICY "Permitir todo en aperturas_caja" ON public.aperturas_caja FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cierres_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en cierres_caja" ON public.cierres_caja;
CREATE POLICY "Permitir todo en cierres_caja" ON public.cierres_caja FOR ALL USING (true) WITH CHECK (true);

-- Movimientos de Caja
ALTER TABLE IF EXISTS public.movimientos_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en movimientos_caja" ON public.movimientos_caja;
CREATE POLICY "Permitir todo en movimientos_caja" ON public.movimientos_caja FOR ALL USING (true) WITH CHECK (true);

-- Gastos Operativos
ALTER TABLE IF EXISTS public.gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en gastos" ON public.gastos;
CREATE POLICY "Permitir todo en gastos" ON public.gastos FOR ALL USING (true) WITH CHECK (true);

-- Clientes y Abonos
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON public.clientes;
CREATE POLICY "Permitir todo en clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en cuentas_por_cobrar" ON public.cuentas_por_cobrar;
CREATE POLICY "Permitir todo en cuentas_por_cobrar" ON public.cuentas_por_cobrar FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.abonos_cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en abonos_cuentas_por_cobrar" ON public.abonos_cuentas_por_cobrar;
CREATE POLICY "Permitir todo en abonos_cuentas_por_cobrar" ON public.abonos_cuentas_por_cobrar FOR ALL USING (true) WITH CHECK (true);

-- Ventas, Detalles y Pagos
ALTER TABLE IF EXISTS public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select ventas POS" ON public.ventas;
DROP POLICY IF EXISTS "Permitir insertar ventas POS" ON public.ventas;
DROP POLICY IF EXISTS "Permitir todo en ventas" ON public.ventas;
CREATE POLICY "Permitir todo en ventas" ON public.ventas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.venta_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en venta_detalles" ON public.venta_detalles;
CREATE POLICY "Permitir todo en venta_detalles" ON public.venta_detalles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.pagos_venta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en pagos_venta" ON public.pagos_venta;
CREATE POLICY "Permitir todo en pagos_venta" ON public.pagos_venta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica para roles" ON public.roles;
CREATE POLICY "Lectura publica para roles" ON public.roles FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.metodos_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica para metodos_pago" ON public.metodos_pago;
CREATE POLICY "Lectura publica para metodos_pago" ON public.metodos_pago FOR SELECT USING (true);

-- Verificación final
SELECT 
    (SELECT count(*) FROM public.negocios) as total_negocios,
    (SELECT count(*) FROM public.sucursales) as total_sucursales,
    (SELECT count(*) FROM public.cajas) as total_cajas;
