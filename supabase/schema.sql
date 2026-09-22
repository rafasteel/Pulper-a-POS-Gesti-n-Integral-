-- ==============================================================================
-- SISTEMA INTEGRAL DE PUNTO DE VENTA, INVENTARIO Y GESTIÓN PARA PULPERÍAS (POS)
-- MOTOR DE BASE DE DATOS: SUPABASE (PostgreSQL 15+)
-- ==============================================================================

-- 0. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. CONFIGURACIÓN, NEGOCIOS Y ROLES (RBAC MULTI-TENANT)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS negocios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    nombre_comercial TEXT,
    identificacion_fiscal TEXT, -- RUC / RUT / Cédula jurídica
    moneda_simbolo TEXT DEFAULT 'C$', -- Por defecto Córdobas, configurable a USD, MXN, CRC, etc.
    moneda_codigo TEXT DEFAULT 'NIO',
    pais TEXT DEFAULT 'Nicaragua',
    timezone TEXT DEFAULT 'America/Managua',
    telefono TEXT,
    whatsapp TEXT,
    email TEXT,
    direccion TEXT,
    logo_url TEXT,
    mensaje_ticket TEXT DEFAULT '¡Gracias por su compra en su pulpería amiga!',
    -- Control de Suscripción SaaS Multi-Tenant
    estado_suscripcion TEXT NOT NULL DEFAULT 'prueba' CHECK (estado_suscripcion IN ('activa', 'suspendida', 'prueba', 'vencida')),
    fecha_vencimiento DATE DEFAULT (CURRENT_DATE + INTERVAL '15 days'),
    plan TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'pro', 'empresarial')),
    precio_mensual NUMERIC(10, 2) DEFAULT 15.00,
    limite_sucursales INT DEFAULT 1,
    limite_usuarios INT DEFAULT 3,
    configuraciones JSONB DEFAULT '{
        "permite_fiado_sin_limite": false,
        "imprimir_recibo_automatico": false,
        "sonido_escaner_activo": true,
        "alerta_stock_minimo": true,
        "porcentaje_impuesto_default": 0.00
    }'::jsonb,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    nombre TEXT NOT NULL,
    direccion TEXT,
    telefono TEXT,
    es_matriz BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(negocio_id, codigo)
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL, -- 'superadmin', 'propietario', 'administrador', 'cajero', 'bodeguero', 'contador'
    nombre TEXT NOT NULL,
    descripcion TEXT,
    nivel_jerarquia INT NOT NULL DEFAULT 1 -- 1000: Superadmin, 100: Propietario, 80: Admin, 50: Bodega/Contador, 20: Cajero
);

CREATE TABLE IF NOT EXISTS permisos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL, -- ej: 'pos.anular_venta', 'pos.aplicar_descuento', 'inventario.ajustar'
    modulo TEXT NOT NULL,
    descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS roles_permisos (
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY(rol_id, permiso_id)
);

CREATE TABLE IF NOT EXISTS usuarios_perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    negocio_id UUID REFERENCES negocios(id) ON DELETE CASCADE, -- NULL únicamente para Super Admin de plataforma
    sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
    rol_id UUID NOT NULL REFERENCES roles(id),
    nombre TEXT NOT NULL,
    apellido TEXT,
    telefono TEXT,
    pin_seguridad_hash TEXT, -- Hash bcrypt/argon2 para cambio rápido de cajero y autorizaciones supervisor
    avatar_url TEXT,
    activo BOOLEAN DEFAULT true,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. CATÁLOGO, PRESENTACIONES Y CONTROL DE STOCK (UNIDAD BASE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS categorias_productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    icono TEXT DEFAULT 'package',
    color TEXT DEFAULT '#3B82F6',
    orden INT DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- El producto almacena la definición del artículo e inventario a nivel de unidad base
CREATE TABLE IF NOT EXISTS productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_productos(id) ON DELETE SET NULL,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad_medida_base TEXT DEFAULT 'unidad', -- 'unidad', 'kg', 'libra', 'litro', 'paquete'
    permite_decimales BOOLEAN DEFAULT false, -- True para venta a granel (ej. 1.5 libras de frijoles)
    es_favorito BOOLEAN DEFAULT false, -- Acceso rápido en el POS
    stock_minimo NUMERIC(12, 3) DEFAULT 5,
    stock_maximo NUMERIC(12, 3) DEFAULT 100,
    perecedero BOOLEAN DEFAULT false,
    fecha_vencimiento_proxima DATE,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presentaciones: Resuelve el modelo pulpería (ej. 1 Caja = 24 Unidades, 1 Six-Pack = 6)
-- Cada presentación tiene su propio código de barras para escaneo directo y factor multiplicador
CREATE TABLE IF NOT EXISTS presentaciones_producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, -- 'Unidad suelta', 'Six-Pack', 'Caja x 24', 'Fardo', 'Media Libra'
    factor_conversion NUMERIC(12, 4) NOT NULL DEFAULT 1.0000, -- Cuántas unidades base descuenta del stock
    codigo_barras TEXT, -- Código UPC / EAN escaneable
    precio_costo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    precio_venta NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    precio_mayoreo NUMERIC(12, 2), -- Precio especial por volumen o clientes preferenciales
    margen_ganancia_porcentaje NUMERIC(6, 2) GENERATED ALWAYS AS (
        CASE WHEN precio_costo > 0 THEN ROUND(((precio_venta - precio_costo) / precio_costo) * 100, 2) ELSE 0 END
    ) STORED,
    es_presentacion_base BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(producto_id, nombre)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_presentaciones_codigo_barras 
ON presentaciones_producto(codigo_barras) 
WHERE codigo_barras IS NOT NULL AND codigo_barras <> '';

-- Existencia real en stock por sucursal (siempre expresada en la UNIDAD BASE del producto)
CREATE TABLE IF NOT EXISTS existencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad_disponible NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    cantidad_reservada NUMERIC(12, 3) NOT NULL DEFAULT 0.000, -- Pedidos en proceso
    ubicacion_estante TEXT, -- Ej. 'Tramo 2, Estante B'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sucursal_id, producto_id)
);

-- Historial Kardex de todo movimiento de inventario (Inmutable para auditoría)
CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    tipo_movimiento TEXT NOT NULL, -- 'venta', 'compra', 'ajuste_positivo', 'ajuste_negativo', 'merma', 'conteo_fisico', 'devolucion'
    cantidad_base NUMERIC(12, 3) NOT NULL, -- Positivo para entradas, negativo para salidas
    saldo_anterior NUMERIC(12, 3) NOT NULL,
    saldo_nuevo NUMERIC(12, 3) NOT NULL,
    costo_unitario_base NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    referencia_tipo TEXT, -- 'ventas', 'compras', 'conteos_fisicos', 'ajustes'
    referencia_id UUID,
    motivo TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. PROVEEDORES, COMPRAS Y CONTEO FÍSICO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre_comercial TEXT NOT NULL,
    razon_social TEXT,
    ruc TEXT,
    contacto_nombre TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    dias_credito INT DEFAULT 0,
    saldo_pendiente NUMERIC(12, 2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    proveedor_id UUID NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
    numero_factura TEXT,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento_pago DATE,
    tipo_pago TEXT DEFAULT 'contado', -- 'contado', 'credito'
    estado TEXT DEFAULT 'recibida', -- 'borrador', 'recibida', 'pagada', 'cancelada'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    observaciones TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compra_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compra_id UUID NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    presentacion_id UUID NOT NULL REFERENCES presentaciones_producto(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12, 3) NOT NULL,
    factor_conversion NUMERIC(12, 4) NOT NULL,
    costo_unitario NUMERIC(12, 2) NOT NULL,
    costo_anterior NUMERIC(12, 2) DEFAULT 0.00,
    alerta_alza_costo BOOLEAN DEFAULT false,
    subtotal NUMERIC(12, 2) NOT NULL
);

-- Auditorías y conteos físicos móviles
CREATE TABLE IF NOT EXISTS conteos_fisicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    estado TEXT DEFAULT 'en_proceso', -- 'en_proceso', 'aplicado', 'descartado'
    usuario_creador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    usuario_aprobador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notas TEXT,
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_cierre TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS conteo_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conteo_id UUID NOT NULL REFERENCES conteos_fisicos(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    presentacion_id UUID REFERENCES presentaciones_producto(id) ON DELETE SET NULL,
    stock_sistema_base NUMERIC(12, 3) NOT NULL,
    stock_contado_base NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    diferencia_base NUMERIC(12, 3) GENERATED ALWAYS AS (stock_contado_base - stock_sistema_base) STORED,
    ajuste_aplicado BOOLEAN DEFAULT false,
    fecha_escaneo TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. CAJA Y ARQUEO CIEGO
-- ==============================================================================

CREATE TABLE IF NOT EXISTS cajas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, -- 'Caja 1 - Principal', 'Caja Mostrador'
    codigo TEXT NOT NULL,
    activa BOOLEAN DEFAULT true,
    UNIQUE(sucursal_id, codigo)
);

CREATE TABLE IF NOT EXISTS aperturas_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
    usuario_apertura_id UUID NOT NULL REFERENCES auth.users(id),
    monto_inicial_efectivo NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estado TEXT DEFAULT 'abierta', -- 'abierta', 'cerrada'
    fecha_apertura TIMESTAMPTZ DEFAULT NOW(),
    notas TEXT
);

CREATE TABLE IF NOT EXISTS cierres_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apertura_id UUID UNIQUE NOT NULL REFERENCES aperturas_caja(id) ON DELETE CASCADE,
    usuario_cierre_id UUID NOT NULL REFERENCES auth.users(id),
    fecha_cierre TIMESTAMPTZ DEFAULT NOW(),
    -- Cierre ciego: El cajero ingresa lo que contó físicamente antes de ver el esperado
    monto_declarado_efectivo NUMERIC(12, 2) NOT NULL,
    desglose_monedas_billetes JSONB, -- Conteo por billetes: {"billete_1000": 3, "billete_500": 8, "monedas": 150}
    -- Datos calculados por el sistema tras el envío ciego:
    monto_esperado_efectivo NUMERIC(12, 2) NOT NULL,
    diferencia_efectivo NUMERIC(12, 2) NOT NULL, -- declarado - esperado (positivo = sobrante, negativo = faltante)
    total_ventas_efectivo NUMERIC(12, 2) DEFAULT 0.00,
    total_ventas_tarjeta NUMERIC(12, 2) DEFAULT 0.00,
    total_ventas_transferencia NUMERIC(12, 2) DEFAULT 0.00,
    total_ventas_fiado NUMERIC(12, 2) DEFAULT 0.00,
    total_ingresos_extra NUMERIC(12, 2) DEFAULT 0.00,
    total_retiros_gastos NUMERIC(12, 2) DEFAULT 0.00,
    total_abonos_recibidos NUMERIC(12, 2) DEFAULT 0.00,
    notas_cajero TEXT,
    aprobado_por_admin UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS movimientos_caja (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    apertura_caja_id UUID NOT NULL REFERENCES aperturas_caja(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'entrada_efectivo', 'retiro_gasto', 'retiro_deposito'
    monto NUMERIC(12, 2) NOT NULL,
    motivo TEXT NOT NULL,
    comprobante_url TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. CLIENTES, FIADO (CRÉDITO) Y CUENTAS POR COBRAR
-- ==============================================================================

CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    apodo TEXT, -- Muy común en pulperías (ej. "Don Carlos el de la esquina")
    cedula TEXT,
    telefono TEXT,
    whatsapp TEXT,
    direccion TEXT,
    limite_credito NUMERIC(12, 2) DEFAULT 500.00,
    saldo_deudor_actual NUMERIC(12, 2) DEFAULT 0.00,
    plazo_credito_dias INT DEFAULT 15,
    bloqueado_por_mora BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuentas_por_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    venta_id UUID, -- Asociada a la venta
    monto_original NUMERIC(12, 2) NOT NULL,
    saldo_pendiente NUMERIC(12, 2) NOT NULL,
    fecha_emision DATE DEFAULT CURRENT_DATE,
    fecha_vencimiento DATE NOT NULL,
    estado TEXT DEFAULT 'vigente', -- 'vigente', 'vencida', 'pagada', 'incobrable'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abonos_cuentas_por_cobrar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cuenta_por_cobrar_id UUID REFERENCES cuentas_por_cobrar(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    apertura_caja_id UUID REFERENCES aperturas_caja(id) ON DELETE SET NULL,
    monto NUMERIC(12, 2) NOT NULL,
    metodo_pago TEXT DEFAULT 'efectivo', -- 'efectivo', 'transferencia'
    referencia_pago TEXT,
    comprobante_whatsapp_enviado BOOLEAN DEFAULT false,
    notas TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. VENTAS, DETALLES, PAGOS Y RECIBOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS metodos_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL, -- 'efectivo', 'tarjeta', 'transferencia', 'fiado', 'mixto'
    nombre TEXT NOT NULL,
    requiere_referencia BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    apertura_caja_id UUID NOT NULL REFERENCES aperturas_caja(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    numero_ticket TEXT NOT NULL, -- Ej: 'T-001-0004523'
    tipo_venta TEXT DEFAULT 'contado', -- 'contado', 'credito_fiado', 'mixto'
    estado TEXT DEFAULT 'completada', -- 'completada', 'anulada', 'en_espera'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    descuento NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    costo_total_estimado NUMERIC(12, 2) DEFAULT 0.00,
    utilidad_bruta_estimada NUMERIC(12, 2) DEFAULT 0.00,
    autorizado_por_id UUID REFERENCES auth.users(id), -- Supervisor que aprobó descuento o venta especial
    cajero_id UUID NOT NULL REFERENCES auth.users(id),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sucursal_id, numero_ticket)
);

CREATE TABLE IF NOT EXISTS venta_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    presentacion_id UUID NOT NULL REFERENCES presentaciones_producto(id) ON DELETE RESTRICT,
    cantidad NUMERIC(12, 3) NOT NULL,
    factor_conversion NUMERIC(12, 4) NOT NULL,
    cantidad_base_descontada NUMERIC(12, 3) GENERATED ALWAYS AS (cantidad * factor_conversion) STORED,
    precio_unitario NUMERIC(12, 2) NOT NULL,
    costo_unitario_base NUMERIC(12, 2) NOT NULL,
    descuento_unitario NUMERIC(12, 2) DEFAULT 0.00,
    subtotal NUMERIC(12, 2) NOT NULL,
    utilidad_estimada NUMERIC(12, 2) GENERATED ALWAYS AS (
        subtotal - (cantidad * factor_conversion * costo_unitario_base)
    ) STORED
);

CREATE TABLE IF NOT EXISTS pagos_venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    metodo_pago_id UUID NOT NULL REFERENCES metodos_pago(id),
    monto NUMERIC(12, 2) NOT NULL,
    monto_recibido NUMERIC(12, 2) DEFAULT 0.00,
    cambio_devuelto NUMERIC(12, 2) DEFAULT 0.00,
    referencia TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. ESCÁNER INALÁMBRICO MÓVIL (REALTIME BROADCAST) & OPERACIONES
-- ==============================================================================

-- Registra sesiones de sincronización de cámara móvil como escáner inalámbrico
CREATE TABLE IF NOT EXISTS sesiones_escaner_movil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    caja_id UUID NOT NULL REFERENCES cajas(id) ON DELETE CASCADE,
    token_emparejamiento TEXT UNIQUE NOT NULL, -- Código de 6 dígitos o hash QR
    nombre_dispositivo TEXT,
    estado TEXT DEFAULT 'esperando', -- 'esperando', 'conectado', 'desconectado'
    usuario_movil_id UUID REFERENCES auth.users(id),
    ultimo_ping TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    apertura_caja_id UUID REFERENCES aperturas_caja(id) ON DELETE SET NULL,
    categoria TEXT NOT NULL, -- 'servicios_luz_agua', 'salarios', 'alquiler', 'limpieza', 'transporte', 'otros'
    descripcion TEXT NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    pagado_desde_caja BOOLEAN DEFAULT true,
    comprobante_url TEXT,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    fecha_gasto DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promociones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'dos_por_uno', 'descuento_porcentaje', 'combo', 'precio_volumen'
    reglas_json JSONB NOT NULL, -- Ej: {"cantidad_minima": 3, "precio_unitario_promocion": 18.00}
    fecha_inicio TIMESTAMPTZ,
    fecha_fin TIMESTAMPTZ,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accion TEXT NOT NULL, -- 'ANULAR_VENTA', 'MODIFICAR_PRECIO', 'CAMBIO_STOCK', 'CIERRE_CAJA_DESCUADRADO'
    tabla_afectada TEXT,
    registro_id TEXT,
    datos_previos JSONB,
    datos_nuevos JSONB,
    ip_origen TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. TRIGGERS AUTOMÁTICOS: KARDEX & ACTUALIZACIÓN DE STOCK EN TIEMPO REAL
-- ==============================================================================

-- Función que descuenta el stock base y genera registro Kardex al completar una venta
CREATE OR REPLACE FUNCTION trg_fn_procesar_venta_inventario()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
    v_stock_actual NUMERIC(12, 3);
    v_nuevo_stock NUMERIC(12, 3);
    v_sucursal_id UUID;
BEGIN
    SELECT sucursal_id INTO v_sucursal_id FROM ventas WHERE id = NEW.id;

    -- Solo procesar cuando la venta pasa a estado 'completada'
    IF NEW.estado = 'completada' AND (TG_OP = 'INSERT' OR OLD.estado <> 'completada') THEN
        FOR item IN (
            SELECT 
                vd.producto_id, 
                vd.presentacion_id, 
                vd.cantidad, 
                vd.factor_conversion,
                vd.cantidad_base_descontada,
                vd.costo_unitario_base
            FROM venta_detalles vd
            WHERE vd.venta_id = NEW.id
        ) LOOP
            -- Obtener o inicializar registro de existencia
            INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible)
            VALUES (v_sucursal_id, item.producto_id, 0.000)
            ON CONFLICT (sucursal_id, producto_id) DO NOTHING;

            SELECT cantidad_disponible INTO v_stock_actual
            FROM existencias
            WHERE sucursal_id = v_sucursal_id AND producto_id = item.producto_id
            FOR UPDATE;

            v_nuevo_stock := v_stock_actual - item.cantidad_base_descontada;

            -- Actualizar existencia real
            UPDATE existencias
            SET cantidad_disponible = v_nuevo_stock, updated_at = NOW()
            WHERE sucursal_id = v_sucursal_id AND producto_id = item.producto_id;

            -- Registrar movimiento Kardex
            INSERT INTO movimientos_inventario (
                sucursal_id,
                producto_id,
                tipo_movimiento,
                cantidad_base,
                saldo_anterior,
                saldo_nuevo,
                costo_unitario_base,
                referencia_tipo,
                referencia_id,
                motivo,
                usuario_id
            ) VALUES (
                v_sucursal_id,
                item.producto_id,
                'venta',
                -item.cantidad_base_descontada,
                v_stock_actual,
                v_nuevo_stock,
                item.costo_unitario_base,
                'ventas',
                NEW.id,
                CONCAT('Venta Ticket #', NEW.numero_ticket),
                NEW.cajero_id
            );
        END LOOP;
        
        -- Si la venta fue al crédito (fiado), crear registro en cuentas_por_cobrar y actualizar saldo cliente
        IF NEW.tipo_venta = 'credito_fiado' AND NEW.cliente_id IS NOT NULL THEN
            INSERT INTO cuentas_por_cobrar (
                negocio_id,
                cliente_id,
                venta_id,
                monto_original,
                saldo_pendiente,
                fecha_vencimiento
            ) VALUES (
                NEW.negocio_id,
                NEW.cliente_id,
                NEW.id,
                NEW.total,
                NEW.total,
                CURRENT_DATE + INTERVAL '15 days'
            );

            UPDATE clientes 
            SET saldo_deudor_actual = saldo_deudor_actual + NEW.total,
                updated_at = NOW()
            WHERE id = NEW.cliente_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_descontar_inventario_venta ON ventas;
CREATE TRIGGER trg_descontar_inventario_venta
AFTER INSERT OR UPDATE ON ventas
FOR EACH ROW
EXECUTE FUNCTION trg_fn_procesar_venta_inventario();

-- Trigger para procesar abonos a cuentas de fiado
CREATE OR REPLACE FUNCTION trg_fn_procesar_abono_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Descontar el saldo deudor global del cliente
    UPDATE clientes
    SET saldo_deudor_actual = GREATEST(0.00, saldo_deudor_actual - NEW.monto),
        updated_at = NOW()
    WHERE id = NEW.cliente_id;

    -- Si el abono apunta a una cuenta específica, rebajarla
    IF NEW.cuenta_por_cobrar_id IS NOT NULL THEN
        UPDATE cuentas_por_cobrar
        SET saldo_pendiente = GREATEST(0.00, saldo_pendiente - NEW.monto),
            estado = CASE WHEN (saldo_pendiente - NEW.monto) <= 0 THEN 'pagada' ELSE estado END
        WHERE id = NEW.cuenta_por_cobrar_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_abono_cliente ON abonos_cuentas_por_cobrar;
CREATE TRIGGER trg_abono_cliente
AFTER INSERT ON abonos_cuentas_por_cobrar
FOR EACH ROW
EXECUTE FUNCTION trg_fn_procesar_abono_cliente();

-- ==============================================================================
-- 9. VISTAS ANALÍTICAS PARA DASHBOARD Y COPILOTO INTELIGENTE (IA)
-- ==============================================================================

-- Vista consolidada del día actual para métricas en vivo
CREATE OR REPLACE VIEW v_dashboard_resumen_dia AS
SELECT 
    v.sucursal_id,
    v.negocio_id,
    CURRENT_DATE AS fecha,
    COUNT(v.id) AS total_transacciones,
    COALESCE(SUM(v.total), 0.00) AS total_ventas,
    COALESCE(SUM(v.costo_total_estimado), 0.00) AS costo_total,
    COALESCE(SUM(v.utilidad_bruta_estimada), 0.00) AS utilidad_bruta,
    COALESCE(AVG(v.total), 0.00) AS ticket_promedio,
    COALESCE(SUM(CASE WHEN v.tipo_venta = 'contado' THEN v.total ELSE 0 END), 0.00) AS ventas_contado,
    COALESCE(SUM(CASE WHEN v.tipo_venta = 'credito_fiado' THEN v.total ELSE 0 END), 0.00) AS ventas_fiado
FROM ventas v
WHERE v.estado = 'completada' AND v.created_at::date = CURRENT_DATE
GROUP BY v.sucursal_id, v.negocio_id;

-- Vista para el Copiloto IA: Productos estancados y capital inmovilizado
CREATE OR REPLACE VIEW v_ia_capital_inmovilizado AS
SELECT 
    p.negocio_id,
    p.id AS producto_id,
    p.nombre AS producto_nombre,
    c.nombre AS categoria,
    e.cantidad_disponible AS stock_unidades_base,
    pr.precio_costo AS costo_unitario,
    (e.cantidad_disponible * pr.precio_costo) AS capital_atrapado,
    MAX(m.created_at) AS ultima_venta
FROM productos p
JOIN existencias e ON e.producto_id = p.id
LEFT JOIN categorias_productos c ON c.id = p.categoria_id
LEFT JOIN presentaciones_producto pr ON pr.producto_id = p.id AND pr.es_presentacion_base = true
LEFT JOIN movimientos_inventario m ON m.producto_id = p.id AND m.tipo_movimiento = 'venta'
WHERE e.cantidad_disponible > 0
GROUP BY p.negocio_id, p.id, p.nombre, c.nombre, e.cantidad_disponible, pr.precio_costo
HAVING MAX(m.created_at) < (NOW() - INTERVAL '30 days') OR MAX(m.created_at) IS NULL
ORDER BY capital_atrapado DESC;

-- ==============================================================================
-- 10. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentaciones_producto ENABLE ROW LEVEL SECURITY;
ALTER TABLE existencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_detalles ENABLE ROW LEVEL SECURITY;
ALTER TABLE aperturas_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonos_cuentas_por_cobrar ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_escaner_movil ENABLE ROW LEVEL SECURITY;

-- Función de ayuda: comprueba si el usuario autenticado es Super Admin del SaaS
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

-- Función de ayuda: obtiene el negocio_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_negocio_id()
RETURNS UUID AS $$
    SELECT negocio_id FROM usuarios_perfiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Función de ayuda: obtiene el rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS TEXT AS $$
    SELECT r.codigo 
    FROM usuarios_perfiles u
    JOIN roles r ON r.id = u.rol_id
    WHERE u.id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Función de ayuda: verifica si la pulpería está al día con su suscripción
CREATE OR REPLACE FUNCTION is_my_negocio_activo()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT estado_suscripcion IN ('activa', 'prueba') 
         FROM negocios 
         WHERE id = get_my_negocio_id()),
        false
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas de aislamiento Multi-Tenant (Mismo negocio) y Bypass para Super Admin
CREATE POLICY "Tenant isolation para negocios"
ON negocios FOR ALL
USING (is_superadmin() OR id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para productos"
ON productos FOR ALL
USING (is_superadmin() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para presentaciones"
ON presentaciones_producto FOR ALL
USING (is_superadmin() OR producto_id IN (SELECT id FROM productos WHERE negocio_id = get_my_negocio_id()));

-- En ventas: Se permite lectura, pero se BLOQUEA la creación/edición de ventas si la suscripción está suspendida
CREATE POLICY "Tenant read para ventas"
ON ventas FOR SELECT
USING (is_superadmin() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant insert para ventas (Activas o Superadmin)"
ON ventas FOR INSERT
WITH CHECK (is_superadmin() OR (negocio_id = get_my_negocio_id() AND is_my_negocio_activo()));

CREATE POLICY "Tenant isolation para clientes"
ON clientes FOR ALL
USING (is_superadmin() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para cierres de caja"
ON cierres_caja FOR ALL
USING (is_superadmin() OR apertura_id IN (SELECT ac.id FROM aperturas_caja ac JOIN cajas c ON c.id = ac.caja_id JOIN sucursales s ON s.id = c.sucursal_id WHERE s.negocio_id = get_my_negocio_id()));

CREATE POLICY "Tenant isolation sesiones escaner"
ON sesiones_escaner_movil FOR ALL
USING (is_superadmin() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para usuarios_perfiles"
ON usuarios_perfiles FOR ALL
USING (is_superadmin() OR id = auth.uid() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para categorias_productos"
ON categorias_productos FOR ALL
USING (is_superadmin() OR negocio_id = get_my_negocio_id());

CREATE POLICY "Tenant isolation para venta_detalles"
ON venta_detalles FOR ALL
USING (is_superadmin() OR venta_id IN (SELECT id FROM ventas WHERE negocio_id = get_my_negocio_id()));

CREATE POLICY "Tenant isolation para pagos_venta"
ON pagos_venta FOR ALL
USING (is_superadmin() OR venta_id IN (SELECT id FROM ventas WHERE negocio_id = get_my_negocio_id()));

CREATE POLICY "Tenant isolation para existencias"
ON existencias FOR ALL
USING (is_superadmin() OR sucursal_id IN (SELECT id FROM sucursales WHERE negocio_id = get_my_negocio_id()));

CREATE POLICY "Tenant isolation para movimientos_inventario"
ON movimientos_inventario FOR ALL
USING (is_superadmin() OR sucursal_id IN (SELECT id FROM sucursales WHERE negocio_id = get_my_negocio_id()));

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica para roles" ON roles FOR SELECT USING (true);

ALTER TABLE metodos_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica para metodos_pago" ON metodos_pago FOR SELECT USING (true);

-- ==============================================================================
-- 11. DATOS SEMILLA BÁSICOS (ROLES Y MÉTODOS DE PAGO)
-- ==============================================================================

INSERT INTO roles (codigo, nombre, descripcion, nivel_jerarquia) VALUES
('superadmin', 'Super Administrador (SaaS Vendor)', 'Control total sobre todos los clientes, suscripciones y configuración de la plataforma SaaS', 1000),
('propietario', 'Dueño / Propietario', 'Acceso irrestricto a finanzas, configuración y múltiples sucursales de su pulpería', 100),
('administrador', 'Administrador de Tienda', 'Gestión de catálogo, compras, inventario, reportes y aprobaciones', 80),
('cajero', 'Cajero de Mostrador', 'Operación de POS, aperturas, ventas, cobros y arqueos ciegos', 30),
('bodeguero', 'Bodeguero / Almacén', 'Recepción de mercadería, control de inventario y conteo físico', 40),
('contador', 'Contador', 'Acceso a gastos, cuentas por cobrar/pagar y reportes contables', 50)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO metodos_pago (codigo, nombre, requiere_referencia, activo) VALUES
('efectivo', 'Efectivo', false, true),
('tarjeta', 'Tarjeta de Débito / Crédito', true, true),
('transferencia', 'Transferencia Bancaria / Móvil', true, true),
('fiado', 'Crédito de Pulpería (Fiado)', false, true),
('mixto', 'Pago Mixto (Efectivo + Otro)', false, true)
ON CONFLICT (codigo) DO NOTHING;

