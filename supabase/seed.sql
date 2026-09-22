-- ==============================================================================
-- DATOS SEMILLA PARA PULPERÍA POS (SAAS MULTI-TENANT)
-- Archivo: supabase/seed.sql
-- Ejecutar en Supabase SQL Editor para poblar con datos de prueba
-- ==============================================================================

-- 1. ASEGURAR ROLES DEL SISTEMA
INSERT INTO roles (id, codigo, nombre, descripcion, nivel_jerarquia) VALUES
('a0000000-0000-0000-0000-000000000001', 'superadmin', 'Super Administrador (SaaS Vendor)', 'Control total sobre todos los clientes, suscripciones y configuración de la plataforma SaaS', 1000),
('a0000000-0000-0000-0000-000000000002', 'propietario', 'Dueño / Propietario', 'Acceso total a finanzas, inventario y sucursales de su negocio', 100),
('a0000000-0000-0000-0000-000000000003', 'administrador', 'Administrador de Tienda', 'Gestión de catálogo, compras, reportes y aprobaciones', 80),
('a0000000-0000-0000-0000-000000000004', 'cajero', 'Cajero de Mostrador', 'Operación de POS, aperturas, ventas, cobros y arqueos ciegos', 30),
('a0000000-0000-0000-0000-000000000005', 'bodeguero', 'Bodeguero / Almacén', 'Recepción de mercadería, control de inventario y conteo físico', 40),
('a0000000-0000-0000-0000-000000000006', 'contador', 'Contador', 'Acceso a gastos, cuentas por cobrar/pagar y reportes contables', 50)
ON CONFLICT (codigo) DO NOTHING;

-- 2. PULPERÍAS / NEGOCIOS CLIENTES (SAAS)

-- Negocio 1: Pulpería La Bendición (Suscripción ACTIVA - Plan Pro)
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
    estado_suscripcion = EXCLUDED.estado_suscripcion,
    plan = EXCLUDED.plan;

-- Negocio 2: Minimarket El Ahorro (Suscripción SUSPENDIDA - Para probar bloqueo por mora)
INSERT INTO negocios (
    id, nombre, nombre_comercial, identificacion_fiscal, moneda_simbolo, moneda_codigo,
    pais, telefono, whatsapp, email, direccion, estado_suscripcion, fecha_vencimiento, plan, precio_mensual
) VALUES (
    '22222222-2222-2222-2222-222222222221',
    'Minimarket El Ahorro',
    'El Ahorro Express',
    'J0310000987654',
    'C$',
    'NIO',
    'Nicaragua',
    '+505 8711-2233',
    '50587112233',
    'carlos@elahorro.com',
    'Frente a la rotonda El Güegüense',
    'suspendida',
    '2026-09-01',
    'basico',
    15.00
) ON CONFLICT (id) DO UPDATE SET
    estado_suscripcion = EXCLUDED.estado_suscripcion,
    plan = EXCLUDED.plan;

-- Negocio 3: Abarrotes Doña Julia (Suscripción EN PRUEBA - 7 días restantes)
INSERT INTO negocios (
    id, nombre, nombre_comercial, identificacion_fiscal, moneda_simbolo, moneda_codigo,
    pais, telefono, whatsapp, email, direccion, estado_suscripcion, fecha_vencimiento, plan, precio_mensual
) VALUES (
    '33333333-3333-3333-3333-333333333331',
    'Abarrotes Doña Julia',
    'Tienda Doña Julia',
    'J0310000456789',
    'C$',
    'NIO',
    'Nicaragua',
    '+505 8655-4433',
    '50586554433',
    'julia@abarrotes.com',
    'Barrio San José, terminal de buses',
    'prueba',
    CURRENT_DATE + INTERVAL '7 days',
    'basico',
    15.00
) ON CONFLICT (id) DO UPDATE SET
    estado_suscripcion = EXCLUDED.estado_suscripcion,
    plan = EXCLUDED.plan;

-- 3. SUCURSALES MATRIZ
INSERT INTO sucursales (id, negocio_id, codigo, nombre, direccion, es_matriz, activa) VALUES
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'SUC-01', 'Mostrador Principal La Bendición', 'De la Iglesia El Carmen 2c. al Sur', true, true),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222221', 'SUC-01', 'Caja 1 El Ahorro', 'Rotonda El Güegüense', true, true),
('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331', 'SUC-01', 'Mostrador Doña Julia', 'Barrio San José', true, true)
ON CONFLICT (negocio_id, codigo) DO NOTHING;

-- 4. CAJAS REGISTRADORAS
INSERT INTO cajas (id, sucursal_id, nombre, codigo, activa) VALUES
('11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111112', 'Caja Mostrador 1', 'CAJA-01', true),
('22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'Caja Principal El Ahorro', 'CAJA-01', true)
ON CONFLICT (sucursal_id, codigo) DO NOTHING;

-- 5. CATEGORÍAS DE PRODUCTOS (Para La Bendición)
INSERT INTO categorias_productos (id, negocio_id, nombre, descripcion, icono, color) VALUES
('cat-00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Bebidas & Refrescos', 'Gaseosas, jugos y aguas', 'CupSoda', '#06b6d4'),
('cat-00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Cervezas & Licores', 'Cervezas nacionales y rones', 'Beer', '#eab308'),
('cat-00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Granos Básicos', 'Arroz, frijoles, azúcar a granel', 'Wheat', '#f59e0b'),
('cat-00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Lácteos & Huevos', 'Queso, leche y huevos de granja', 'Egg', '#3b82f6'),
('cat-00000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Abarrotes & Aceites', 'Aceites, pastas y salsas', 'Package', '#10b981'),
('cat-00000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Cigarrillos', 'Cigarrillos sueltos y cajetillas', 'Flame', '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- 6. 10 PRODUCTOS BASE DE PULPERÍA (Con existencias y presentaciones múltiples)

-- 1. Coca-Cola 3 Litros
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000001', 'Coca-Cola Desechable 3 Litros', 'unidad', false, true, 6, 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000001', 'Unidad', 1.0, '741100180010', 75.00, 95.00, true),
('p0000000-0000-0000-0000-000000000001', 'Fardo x 6 Unidades', 6.0, '741100180011', 450.00, 540.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000001', 32.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 2. Cerveza Toña Lata 350ml
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000002', 'Cerveza Toña Lata 350ml', 'unidad', false, true, 24, 144)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000002', 'Lata Suelta', 1.0, '741100180020', 35.00, 45.00, true),
('p0000000-0000-0000-0000-000000000002', 'Six-Pack (6 Latas)', 6.0, '741100180021', 210.00, 250.00, false),
('p0000000-0000-0000-0000-000000000002', 'Caja x 24 Latas', 24.0, '741100180022', 840.00, 980.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000002', 72.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 3. Frijoles Rojos de Seda (Granel)
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000003', 'Frijoles Rojos de Seda Nacional', 'libra', true, true, 20, 200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000003', 'Libra (Granel)', 1.0, '741100180030', 28.00, 35.00, true),
('p0000000-0000-0000-0000-000000000003', 'Saco Quintal (100 lb)', 100.0, '741100180031', 2700.00, 3200.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000003', 140.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 4. Arroz Faisán 96/4
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000003', 'Arroz Faisán 96/4 Grano Entero', 'libra', true, true, 25, 250)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000004', 'Libra', 1.0, '741100180035', 18.00, 22.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000004', 95.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 5. Aceite Ideal 1L
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000005', 'Aceite Vegetal Ideal 1 Litro', 'unidad', false, true, 12, 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000005', 'Botella 1L', 1.0, '741100180040', 58.00, 72.00, true),
('p0000000-0000-0000-0000-000000000005', 'Caja x 12 Litros', 12.0, '741100180041', 696.00, 820.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000005', 18.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 6. Huevos de Granja
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000004', 'Huevos Blancos de Granja', 'unidad', false, true, 30, 300)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000006', 'Unidad', 1.0, '741100180045', 6.00, 8.00, true),
('p0000000-0000-0000-0000-000000000006', 'Cajilla x 30 Huevos', 30.0, '741100180046', 180.00, 220.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000006', 120.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 7. Cigarrillos Belmont Blue
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000006', 'Cigarrillos Belmont Blue', 'unidad', false, true, 20, 200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000007', 'Cigarro Suelto', 1.0, '741100180050', 5.00, 8.00, true),
('p0000000-0000-0000-0000-000000000007', 'Cajetilla x 20 Cigarrillos', 20.0, '741100180051', 100.00, 130.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000007', 140.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 8. Queso Morolique Seco de Boaco
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000004', 'Queso Morolique Seco de Boaco', 'libra', true, true, 10, 80)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000008', 'Libra', 1.0, '741100180055', 75.00, 92.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000008', 26.500)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 9. Galletas Oreo 4-Pack
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000005', 'Galletas Oreo 4-Pack Original', 'unidad', false, true, 12, 72)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000009', 'Paquete Individual', 1.0, '741100180060', 12.00, 16.00, true),
('p0000000-0000-0000-0000-000000000009', 'Tira x 6 Paquetes', 6.0, '741100180061', 72.00, 90.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000009', 48.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 10. Jabón Xedex Detergente 500g
INSERT INTO productos (id, negocio_id, categoria_id, nombre, unidad_medida_base, permite_decimales, es_favorito, stock_minimo, stock_maximo) VALUES
('p0000000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'cat-00000000-0000-0000-0000-000000000005', 'Jabón en Polvo Xedex 500g', 'unidad', false, false, 10, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO presentaciones_producto (producto_id, nombre, factor_conversion, codigo_barras, precio_costo, precio_venta, es_presentacion_base) VALUES
('p0000000-0000-0000-0000-000000000010', 'Bolsa 500g', 1.0, '741100180070', 32.00, 42.00, true),
('p0000000-0000-0000-0000-000000000010', 'Fardo x 24 Bolsas', 24.0, '741100180071', 768.00, 940.00, false)
ON CONFLICT DO NOTHING;

INSERT INTO existencias (sucursal_id, producto_id, cantidad_disponible) VALUES
('11111111-1111-1111-1111-111111111112', 'p0000000-0000-0000-0000-000000000010', 24.000)
ON CONFLICT (sucursal_id, producto_id) DO UPDATE SET cantidad_disponible = EXCLUDED.cantidad_disponible;

-- 7. CLIENTES DE CONFIANZA ("FIADO") PARA LA BENDICIÓN
INSERT INTO clientes (id, negocio_id, nombre, apodo, telefono, whatsapp, direccion, limite_credito, saldo_deudor_actual, plazo_credito_dias, bloqueado_por_mora) VALUES
('c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Carlos Enrique Mora', 'Don Carlos (Mecánico)', '8844-1122', '50588441122', 'Frente al Taller Mora', 1500.00, 450.00, 15, false),
('c0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Martha Lorena Pineda', 'Profesora Martha', '8722-3344', '50587223344', 'Casa verde esquinera #12', 2500.00, 1850.00, 30, false),
('c0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Roberto José Gutiérrez', 'Don Chepe Panadero', '8911-5544', '50589115544', 'Costado Norte del Parque', 800.00, 850.00, 8, true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 8. USUARIOS AUTENTICADOS (auth.users & usuarios_perfiles)
-- ==============================================================================

-- Cuenta 1: Super Admin (Dueño de Plataforma)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'u0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@pulposaas.com',
    crypt('SuperAdmin2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Rafael","apellido":"Super Admin"}',
    false,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios_perfiles (id, negocio_id, sucursal_id, rol_id, nombre, apellido, telefono, pin_seguridad_hash, activo) VALUES
('u0000000-0000-0000-0000-000000000001', NULL, NULL, 'a0000000-0000-0000-0000-000000000001', 'Rafael', 'Super Admin', '+504 9999-8888', '9999', true)
ON CONFLICT (id) DO UPDATE SET rol_id = EXCLUDED.rol_id, pin_seguridad_hash = EXCLUDED.pin_seguridad_hash;

-- Cuenta 2: Don Manuel (Propietario Pulpería La Bendición - ACTIVA)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'u0000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'donmanuel@labendicion.com',
    crypt('Pulperia123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Don Manuel","apellido":"Mendoza"}',
    false,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios_perfiles (id, negocio_id, sucursal_id, rol_id, nombre, apellido, telefono, pin_seguridad_hash, activo) VALUES
('u0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', 'a0000000-0000-0000-0000-000000000002', 'Don Manuel', 'Mendoza', '+505 8899-7766', '1234', true)
ON CONFLICT (id) DO UPDATE SET rol_id = EXCLUDED.rol_id, pin_seguridad_hash = EXCLUDED.pin_seguridad_hash;

-- Cuenta 3: Rosa Gómez (Cajera Pulpería La Bendición)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'u0000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'rosa@labendicion.com',
    crypt('Cajera123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Rosa","apellido":"Gómez"}',
    false,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios_perfiles (id, negocio_id, sucursal_id, rol_id, nombre, apellido, telefono, pin_seguridad_hash, activo) VALUES
('u0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111112', 'a0000000-0000-0000-0000-000000000004', 'Rosa', 'Gómez', '+505 8811-9922', '4321', true)
ON CONFLICT (id) DO UPDATE SET rol_id = EXCLUDED.rol_id, pin_seguridad_hash = EXCLUDED.pin_seguridad_hash;

-- Cuenta 4: Carlos (Propietario Minimarket El Ahorro - SUSPENDIDA)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'u0000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'carlos@elahorro.com',
    crypt('ElAhorro123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nombre":"Carlos","apellido":"Pérez"}',
    false,
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios_perfiles (id, negocio_id, sucursal_id, rol_id, nombre, apellido, telefono, pin_seguridad_hash, activo) VALUES
('u0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000002', 'Carlos', 'Pérez', '+505 8711-2233', '5555', true)
ON CONFLICT (id) DO UPDATE SET rol_id = EXCLUDED.rol_id, pin_seguridad_hash = EXCLUDED.pin_seguridad_hash;

-- ==============================================================================
-- 9. APERTURA DE CAJA INICIAL ACTIVA PARA CAJA-01 (La Bendición)
-- ==============================================================================
INSERT INTO aperturas_caja (id, caja_id, usuario_apertura_id, monto_inicial_efectivo, estado, fecha_apertura, notas) VALUES
('ap000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111115', 'u0000000-0000-0000-0000-000000000003', 1000.00, 'abierta', NOW(), 'Turno Matutino Inicial')
ON CONFLICT (id) DO NOTHING;

