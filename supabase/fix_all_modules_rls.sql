-- ==============================================================================
-- CORRECCIÓN Y POLÍTICAS RLS GLOBALES PARA 100% SUPABASE CLOUD (PULPERÍA POS)
-- Archivo: supabase/fix_all_modules_rls.sql
-- Ejecuta este script en: Panel de Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. ASEGURAR EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FLEXIBILIZACIÓN DE CONSTRAINTS DE USUARIO (PIN TÁCTIL Y CAJERO LOCAL)
-- ==============================================================================

-- Compras y Recepción de Mercadería
ALTER TABLE IF EXISTS public.compras ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.compras DROP CONSTRAINT IF EXISTS compras_usuario_id_fkey;

-- Conteos Físicos y Auditoría de Stock
ALTER TABLE IF EXISTS public.conteos_fisicos ALTER COLUMN usuario_creador_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.conteos_fisicos DROP CONSTRAINT IF EXISTS conteos_fisicos_usuario_creador_id_fkey;
ALTER TABLE IF EXISTS public.conteos_fisicos ALTER COLUMN usuario_aprobador_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.conteos_fisicos DROP CONSTRAINT IF EXISTS conteos_fisicos_usuario_aprobador_id_fkey;

-- Movimientos de Inventario (Kardex)
ALTER TABLE IF EXISTS public.movimientos_inventario ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.movimientos_inventario DROP CONSTRAINT IF EXISTS movimientos_inventario_usuario_id_fkey;

-- Auditoría Logs
ALTER TABLE IF EXISTS public.auditoria_logs ALTER COLUMN usuario_id DROP NOT NULL;
ALTER TABLE IF EXISTS public.auditoria_logs DROP CONSTRAINT IF EXISTS auditoria_logs_usuario_id_fkey;

-- Aperturas, Movimientos, Gastos, Abonos y Ventas
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
-- 3. POLÍTICAS RLS PERMISIVAS (CATÁLOGO, INVENTARIO, COMPRAS Y CONTEOS)
-- ==============================================================================

-- 3.1. PRODUCTOS
ALTER TABLE IF EXISTS public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para productos" ON public.productos;
DROP POLICY IF EXISTS "Permitir all productos" ON public.productos;
CREATE POLICY "Permitir all productos" ON public.productos FOR ALL USING (true) WITH CHECK (true);

-- 3.2. PRESENTACIONES DE PRODUCTO
ALTER TABLE IF EXISTS public.presentaciones_producto ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para presentaciones" ON public.presentaciones_producto;
DROP POLICY IF EXISTS "Permitir all presentaciones" ON public.presentaciones_producto;
CREATE POLICY "Permitir all presentaciones" ON public.presentaciones_producto FOR ALL USING (true) WITH CHECK (true);

-- 3.3. CATEGORÍAS DE PRODUCTOS
ALTER TABLE IF EXISTS public.categorias_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para categorias_productos" ON public.categorias_productos;
DROP POLICY IF EXISTS "Permitir all categorias" ON public.categorias_productos;
CREATE POLICY "Permitir all categorias" ON public.categorias_productos FOR ALL USING (true) WITH CHECK (true);

-- 3.4. EXISTENCIAS DE STOCK
ALTER TABLE IF EXISTS public.existencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para existencias" ON public.existencias;
DROP POLICY IF EXISTS "Permitir all existencias" ON public.existencias;
CREATE POLICY "Permitir all existencias" ON public.existencias FOR ALL USING (true) WITH CHECK (true);

-- 3.5. MOVIMIENTOS DE INVENTARIO (KARDEX)
ALTER TABLE IF EXISTS public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para movimientos_inventario" ON public.movimientos_inventario;
DROP POLICY IF EXISTS "Permitir all movimientos_inventario" ON public.movimientos_inventario;
CREATE POLICY "Permitir all movimientos_inventario" ON public.movimientos_inventario FOR ALL USING (true) WITH CHECK (true);

-- 3.6. PROVEEDORES
ALTER TABLE IF EXISTS public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all proveedores" ON public.proveedores;
CREATE POLICY "Permitir all proveedores" ON public.proveedores FOR ALL USING (true) WITH CHECK (true);

-- 3.7. COMPRAS Y DETALLES DE COMPRA
ALTER TABLE IF EXISTS public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all compras" ON public.compras;
CREATE POLICY "Permitir all compras" ON public.compras FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.compra_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all compra_detalles" ON public.compra_detalles;
CREATE POLICY "Permitir all compra_detalles" ON public.compra_detalles FOR ALL USING (true) WITH CHECK (true);

-- 3.8. CONTEOS FÍSICOS Y DETALLES DE CONTEO
ALTER TABLE IF EXISTS public.conteos_fisicos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all conteos_fisicos" ON public.conteos_fisicos;
CREATE POLICY "Permitir all conteos_fisicos" ON public.conteos_fisicos FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.conteo_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all conteo_detalles" ON public.conteo_detalles;
CREATE POLICY "Permitir all conteo_detalles" ON public.conteo_detalles FOR ALL USING (true) WITH CHECK (true);

-- 3.9. NEGOCIOS, SUCURSALES Y CAJAS
ALTER TABLE IF EXISTS public.negocios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para negocios" ON public.negocios;
DROP POLICY IF EXISTS "Permitir all negocios" ON public.negocios;
CREATE POLICY "Permitir all negocios" ON public.negocios FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.sucursales ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all sucursales" ON public.sucursales;
CREATE POLICY "Permitir all sucursales" ON public.sucursales FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cajas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir all cajas" ON public.cajas;
CREATE POLICY "Permitir all cajas" ON public.cajas FOR ALL USING (true) WITH CHECK (true);

-- 3.10. APERTURAS, CIERRES Y MOVIMIENTOS DE CAJA
ALTER TABLE IF EXISTS public.aperturas_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en aperturas_caja" ON public.aperturas_caja;
CREATE POLICY "Permitir todo en aperturas_caja" ON public.aperturas_caja FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cierres_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en cierres_caja" ON public.cierres_caja;
CREATE POLICY "Permitir todo en cierres_caja" ON public.cierres_caja FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.movimientos_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en movimientos_caja" ON public.movimientos_caja;
CREATE POLICY "Permitir todo en movimientos_caja" ON public.movimientos_caja FOR ALL USING (true) WITH CHECK (true);

-- 3.11. GASTOS OPERATIVOS
ALTER TABLE IF EXISTS public.gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en gastos" ON public.gastos;
CREATE POLICY "Permitir todo en gastos" ON public.gastos FOR ALL USING (true) WITH CHECK (true);

-- 3.12. CLIENTES, CUENTAS POR COBRAR Y ABONOS
ALTER TABLE IF EXISTS public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para clientes" ON public.clientes;
DROP POLICY IF EXISTS "Permitir todo en clientes" ON public.clientes;
CREATE POLICY "Permitir todo en clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en cuentas_por_cobrar" ON public.cuentas_por_cobrar;
CREATE POLICY "Permitir todo en cuentas_por_cobrar" ON public.cuentas_por_cobrar FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.abonos_cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo en abonos_cuentas_por_cobrar" ON public.abonos_cuentas_por_cobrar;
CREATE POLICY "Permitir todo en abonos_cuentas_por_cobrar" ON public.abonos_cuentas_por_cobrar FOR ALL USING (true) WITH CHECK (true);

-- 3.13. VENTAS, DETALLES Y PAGOS
ALTER TABLE IF EXISTS public.ventas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant read para ventas" ON public.ventas;
DROP POLICY IF EXISTS "Tenant insert para ventas (Activas o Superadmin)" ON public.ventas;
DROP POLICY IF EXISTS "Permitir todo en ventas" ON public.ventas;
CREATE POLICY "Permitir todo en ventas" ON public.ventas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.venta_detalles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para venta_detalles" ON public.venta_detalles;
DROP POLICY IF EXISTS "Permitir todo en venta_detalles" ON public.venta_detalles;
CREATE POLICY "Permitir todo en venta_detalles" ON public.venta_detalles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.pagos_venta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation para pagos_venta" ON public.pagos_venta;
DROP POLICY IF EXISTS "Permitir todo en pagos_venta" ON public.pagos_venta;
CREATE POLICY "Permitir todo en pagos_venta" ON public.pagos_venta FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica para roles" ON public.roles;
CREATE POLICY "Lectura publica para roles" ON public.roles FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.metodos_pago ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica para metodos_pago" ON public.metodos_pago;
CREATE POLICY "Lectura publica para metodos_pago" ON public.metodos_pago FOR SELECT USING (true);

-- Verificación de tablas
SELECT 'Políticas RLS aplicadas correctamente a todos los módulos de Pulpería POS' as resultado;
