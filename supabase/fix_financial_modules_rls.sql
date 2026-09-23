-- ==============================================================================
-- CORRECCIÓN DE RLS Y RESTRICCIONES PARA MÓDULOS FINANCIEROS (PULPERÍA POS)
-- Módulos: Control de Caja, Gastos y Libreta de Fiados (Clientes y Abonos)
-- Archivo: supabase/fix_financial_modules_rls.sql
-- Ejecuta este script en: Panel de Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. FLEXIBILIZACIÓN DE RESTRICCIONES DE USUARIO (PIN TÁCTIL Y SESIÓN LOCAL)
-- Permite que aperturas de caja, gastos, abonos y movimientos funcionen incluso
-- si el usuario está operando vía PIN táctil sin una cuenta en auth.users.

ALTER TABLE IF EXISTS aperturas_caja ALTER COLUMN usuario_apertura_id DROP NOT NULL;
ALTER TABLE IF EXISTS aperturas_caja DROP CONSTRAINT IF EXISTS aperturas_caja_usuario_apertura_id_fkey;

ALTER TABLE IF EXISTS movimientos_caja ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS movimientos_caja DROP CONSTRAINT IF EXISTS movimientos_caja_usuario_id_fkey;

ALTER TABLE IF EXISTS gastos ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS gastos DROP CONSTRAINT IF EXISTS gastos_usuario_id_fkey;

ALTER TABLE IF EXISTS abonos_cuentas_por_cobrar ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS abonos_cuentas_por_cobrar DROP CONSTRAINT IF EXISTS abonos_cuentas_por_cobrar_usuario_id_fkey;

ALTER TABLE IF EXISTS cierres_caja ALTER COLUMN usuario_cierre_id DROP NOT NULL;
ALTER TABLE IF EXISTS cierres_caja DROP CONSTRAINT IF EXISTS cierres_caja_usuario_cierre_id_fkey;

-- 2. POLÍTICAS RLS PARA APERTURAS Y CIERRES DE CAJA
ALTER TABLE IF EXISTS aperturas_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select aperturas_caja" ON aperturas_caja;
DROP POLICY IF EXISTS "Permitir insert aperturas_caja" ON aperturas_caja;
DROP POLICY IF EXISTS "Permitir update aperturas_caja" ON aperturas_caja;
DROP POLICY IF EXISTS "Permitir todo en aperturas_caja" ON aperturas_caja;

CREATE POLICY "Permitir todo en aperturas_caja"
ON aperturas_caja FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS cierres_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para cierres de caja" ON cierres_caja;
DROP POLICY IF EXISTS "Permitir todo en cierres_caja" ON cierres_caja;

CREATE POLICY "Permitir todo en cierres_caja"
ON cierres_caja FOR ALL
USING (true)
WITH CHECK (true);

-- 3. POLÍTICAS RLS PARA MOVIMIENTOS DE CAJA
ALTER TABLE IF EXISTS movimientos_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select movimientos_caja" ON movimientos_caja;
DROP POLICY IF EXISTS "Permitir insert movimientos_caja" ON movimientos_caja;
DROP POLICY IF EXISTS "Permitir todo en movimientos_caja" ON movimientos_caja;

CREATE POLICY "Permitir todo en movimientos_caja"
ON movimientos_caja FOR ALL
USING (true)
WITH CHECK (true);

-- 4. POLÍTICAS RLS PARA GASTOS OPERATIVOS
ALTER TABLE IF EXISTS gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir select gastos" ON gastos;
DROP POLICY IF EXISTS "Permitir insert gastos" ON gastos;
DROP POLICY IF EXISTS "Permitir todo en gastos" ON gastos;

CREATE POLICY "Permitir todo en gastos"
ON gastos FOR ALL
USING (true)
WITH CHECK (true);

-- 5. POLÍTICAS RLS PARA CLIENTES, CUENTAS POR COBRAR Y ABONOS
ALTER TABLE IF EXISTS clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para clientes" ON clientes;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON clientes;

CREATE POLICY "Permitir todo en clientes"
ON clientes FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en cuentas_por_cobrar" ON cuentas_por_cobrar;

CREATE POLICY "Permitir todo en cuentas_por_cobrar"
ON cuentas_por_cobrar FOR ALL
USING (true)
WITH CHECK (true);

ALTER TABLE IF EXISTS abonos_cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en abonos_cuentas_por_cobrar" ON abonos_cuentas_por_cobrar;

CREATE POLICY "Permitir todo en abonos_cuentas_por_cobrar"
ON abonos_cuentas_por_cobrar FOR ALL
USING (true)
WITH CHECK (true);

-- 6. ASEGURAR CAJA Y SUCURSAL ACTIVAS POR DEFECTO
INSERT INTO negocios (
    id, nombre, nombre_comercial, identificacion_fiscal, moneda_simbolo, moneda_codigo,
    pais, telefono, whatsapp, email, direccion, estado_suscripcion, fecha_vencimiento, plan, precio_mensual
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Pulpería La Bendición',
    'Minimarket & Pulpería La Bendición',
    'J0310000123456',
    'C$',
    'NIO',
    'Nicaragua',
    '+505 8899-7766',
    '50588997766',
    'contacto@labendicion.com',
    'De la Iglesia El Carmen 2c. al Sur, 1/2c. Abajo',
    'activa',
    '2027-12-31',
    'pro',
    25.00
) ON CONFLICT (id) DO UPDATE SET
    estado_suscripcion = 'activa',
    plan = 'pro';

INSERT INTO sucursales (id, negocio_id, codigo, nombre, direccion, es_matriz, activa)
VALUES (
    '11111111-1111-1111-1111-111111111112',
    '11111111-1111-1111-1111-111111111111',
    'SUC-01',
    'Mostrador Principal La Bendición',
    'De la Iglesia El Carmen 2c. al Sur',
    true,
    true
) ON CONFLICT (negocio_id, codigo) DO NOTHING;

INSERT INTO cajas (id, sucursal_id, nombre, codigo, activa)
VALUES (
    '11111111-1111-1111-1111-111111111115',
    '11111111-1111-1111-1111-111111111112',
    'Caja Mostrador 1',
    'CAJA-01',
    true
) ON CONFLICT (sucursal_id, codigo) DO NOTHING;
