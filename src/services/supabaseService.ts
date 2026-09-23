import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  Product,
  ProductPresentation,
  Category,
  Customer,
  Sale,
  UserProfile,
  SaaSTenant,
  CashRegister,
  CashMovement,
  OperationalExpense,
  KardexMovement,
  Supplier,
  Purchase,
  SubscriptionStatus,
  SubscriptionPlan,
} from '../types';

let supabaseInstance: SupabaseClient | null = null;
let activeScannerChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = () => {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('pulperia_supabase_url') || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('pulperia_supabase_key') || '';
  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key && url.startsWith('http') && key.length > 10);
};

export const getSupabaseClient = (url?: string, anonKey?: string): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  const finalUrl = url || config.url;
  const finalKey = anonKey || config.key;

  if (finalUrl && finalKey && finalUrl.startsWith('http')) {
    try {
      supabaseInstance = createClient(finalUrl, finalKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return supabaseInstance;
    } catch (e) {
      console.error('Error inicializando Supabase Client', e);
    }
  }
  return null;
};

export const reconnectSupabase = (url: string, key: string): SupabaseClient | null => {
  localStorage.setItem('pulperia_supabase_url', url.trim());
  localStorage.setItem('pulperia_supabase_key', key.trim());
  supabaseInstance = null;
  return getSupabaseClient(url.trim(), key.trim());
};

export const testSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'No hay credenciales de Supabase configuradas' };
  }
  try {
    const { error } = await client.from('roles').select('id').limit(1);
    if (error) {
      return { ok: false, message: error.message };
    }
    return { ok: true, message: 'Conexión a Supabase exitosa' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Error de red con Supabase' };
  }
};

// ==============================================================================
// 1. AUTENTICACIÓN Y PERFILES DE USUARIO
// ==============================================================================

export const loginWithSupabaseAuth = async (email: string, password: string) => {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: new Error('Supabase no está configurado') };
  }
  return client.auth.signInWithPassword({ email, password });
};

export const logoutSupabaseAuth = async () => {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
};

export const fetchUserProfileLive = async (userId: string): Promise<UserProfile | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('usuarios_perfiles')
      .select(`
        id,
        nombre,
        apellido,
        telefono,
        pin_seguridad_hash,
        avatar_url,
        sucursal_id,
        negocio_id,
        roles ( codigo )
      `)
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    const roleData = data.roles as any;
    const roleCode = (roleData?.codigo || 'cajero') as any;

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido || '',
      telefono: data.telefono,
      pin: data.pin_seguridad_hash || '1234',
      rol: roleCode,
      sucursalId: data.sucursal_id,
      negocioId: data.negocio_id,
      avatarUrl: data.avatar_url,
    };
  } catch (err) {
    console.warn('Error obteniendo perfil live de usuario:', err);
    return null;
  }
};

// ==============================================================================
// 2. CATÁLOGO E INVENTARIO EN VIVO (SELECT)
// ==============================================================================

export const fetchLiveCatalog = async (
  negocioId?: string
): Promise<{ products: Product[]; categories: Category[] } | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Obtener categorías
    let catQuery = client.from('categorias_productos').select('*').order('orden');
    if (negocioId && isValidUUID(negocioId)) {
      catQuery = catQuery.eq('negocio_id', negocioId);
    }
    const { data: catRows, error: catError } = await catQuery;
    if (catError) throw catError;

    const categories: Category[] = (catRows || []).map(c => ({
      id: c.id,
      nombre: c.nombre,
      icono: c.icono || 'Package',
      color: c.color || '#10b981',
    }));

    // 2. Obtener productos con sus presentaciones y existencias
    let prodQuery = client
      .from('productos')
      .select(`
        id,
        categoria_id,
        nombre,
        descripcion,
        unidad_medida_base,
        permite_decimales,
        es_favorito,
        stock_minimo,
        stock_maximo,
        perecedero,
        fecha_vencimiento_proxima,
        imagen_url,
        presentaciones_producto (
          id,
          nombre,
          factor_conversion,
          codigo_barras,
          precio_costo,
          precio_venta,
          precio_mayoreo,
          es_presentacion_base,
          activo
        ),
        existencias (
          cantidad_disponible
        )
      `)
      .eq('activo', true);

    if (negocioId && isValidUUID(negocioId)) {
      prodQuery = prodQuery.eq('negocio_id', negocioId);
    }

    const { data: prodRows, error: prodError } = await prodQuery;
    if (prodError) throw prodError;

    const products: Product[] = (prodRows || []).map((p: any) => {
      const presentaciones: ProductPresentation[] = (p.presentaciones_producto || []).map((pr: any) => ({
        id: pr.id,
        productoId: p.id,
        nombre: pr.nombre,
        factorConversion: Number(pr.factor_conversion || 1),
        codigoBarras: pr.codigo_barras || '',
        precioCosto: Number(pr.precio_costo || 0),
        precioVenta: Number(pr.precio_venta || 0),
        precioMayoreo: pr.precio_mayoreo ? Number(pr.precio_mayoreo) : undefined,
        esPresentacionBase: Boolean(pr.es_presentacion_base),
        activo: Boolean(pr.activo),
      }));

      // Existencia acumulada de la primera sucursal
      const stockExistencia = p.existencias?.[0]?.cantidad_disponible ?? 0;

      return {
        id: p.id,
        categoriaId: p.categoria_id || categories[0]?.id || 'cat-granos',
        nombre: p.nombre,
        descripcion: p.descripcion,
        unidadMedidaBase: p.unidad_medida_base || 'unidad',
        permiteDecimales: Boolean(p.permite_decimales),
        esFavorito: Boolean(p.es_favorito),
        stockMinimo: Number(p.stock_minimo || 5),
        stockMaximo: Number(p.stock_maximo || 100),
        perecedero: Boolean(p.perecedero),
        fechaVencimientoProxima: p.fecha_vencimiento_proxima,
        imagenUrl: p.imagen_url,
        presentaciones: presentaciones,
        existenciaBase: Number(stockExistencia),
      };
    });

    return { products, categories };
  } catch (err) {
    console.error('Error cargando catálogo live desde Supabase:', err);
    return null;
  }
};

// ==============================================================================
// 3. CLIENTES / LIBRETA DE FIADOS EN VIVO (SELECT)
// ==============================================================================

export const fetchLiveCustomers = async (negocioId?: string): Promise<Customer[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('clientes').select('*').eq('activo', true);
    if (negocioId && isValidUUID(negocioId)) {
      query = query.eq('negocio_id', negocioId);
    }
    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      apodo: c.apodo,
      cedula: c.cedula,
      telefono: c.telefono,
      whatsapp: c.whatsapp,
      direccion: c.direccion,
      limiteCredito: Number(c.limite_credito || 500),
      saldoDeudorActual: Number(c.saldo_deudor_actual || 0),
      plazoDias: Number(c.plazo_credito_dias || 15),
      bloqueadoPorMora: Boolean(c.bloqueado_por_mora),
      activo: Boolean(c.activo),
    }));
  } catch (err) {
    console.error('Error cargando clientes desde Supabase:', err);
    return null;
  }
};

export const insertLiveCustomer = async (
  clienteData: {
    nombre: string;
    apodo?: string;
    cedula?: string;
    telefono?: string;
    whatsapp?: string;
    direccion?: string;
    limiteCredito: number;
    plazoDias: number;
  },
  negocioId: string
): Promise<{ success: boolean; customer?: Customer; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para crear cliente.' };
  }

  try {
    const payload = {
      negocio_id: negocioId,
      nombre: clienteData.nombre,
      apodo: clienteData.apodo || null,
      cedula: clienteData.cedula || null,
      telefono: clienteData.telefono || null,
      whatsapp: clienteData.whatsapp || null,
      direccion: clienteData.direccion || null,
      limite_credito: clienteData.limiteCredito,
      saldo_deudor_actual: 0.00,
      plazo_credito_dias: clienteData.plazoDias || 15,
      bloqueado_por_mora: false,
      activo: true,
    };

    console.log('[SupabaseService] Creando nuevo cliente en Supabase:', payload);
    const { data, error } = await client.from('clientes').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error creando cliente:', error);
      return { success: false, error: error.message };
    }

    const newCustomer: Customer = {
      id: data.id,
      nombre: data.nombre,
      apodo: data.apodo,
      cedula: data.cedula,
      telefono: data.telefono,
      whatsapp: data.whatsapp,
      direccion: data.direccion,
      limiteCredito: Number(data.limite_credito),
      saldoDeudorActual: Number(data.saldo_deudor_actual || 0),
      plazoDias: Number(data.plazo_credito_dias),
      bloqueadoPorMora: Boolean(data.bloqueado_por_mora),
      activo: Boolean(data.activo),
    };

    return { success: true, customer: newCustomer };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando cliente' };
  }
};

export const insertLiveCustomerPayment = async (
  clienteId: string,
  monto: number,
  metodo: 'efectivo' | 'transferencia' = 'efectivo',
  notas?: string,
  aperturaCajaId?: string,
  usuarioId?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(clienteId)) {
    return { success: false, error: 'ID de cliente inválido.' };
  }

  try {
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      cliente_id: clienteId,
      monto,
      metodo_pago: metodo,
      notas: notas || 'Abono en mostrador',
    };

    if (isValidUUID(aperturaCajaId)) {
      payload.apertura_caja_id = aperturaCajaId;
    }
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Registrando abono de fiado en Supabase:', payload);
    const { error } = await client
      .from('abonos_cuentas_por_cobrar')
      .insert(payload);

    if (error) {
      console.error('[SupabaseService] Error registrando abono en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando abono' };
  }
};

export const isValidUUID = (val?: string | null): boolean => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
};

// ==============================================================================
// 4. NEGOCIOS Y CONTROL DE CAJA EN VIVO (SUPABASE)
// ==============================================================================

export const fetchLiveTenants = async (): Promise<SaaSTenant[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client.from('negocios').select('*').order('created_at');
    if (error || !data) return null;
    return data.map((n: any) => ({
      id: n.id,
      nombre: n.nombre,
      nombreComercial: n.nombre_comercial || n.nombre,
      propietarioNombre: 'Propietario',
      email: n.email || '',
      telefono: n.telefono || '',
      whatsapp: n.whatsapp || '',
      direccion: n.direccion || '',
      estadoSuscripcion: n.estado_suscripcion || 'activa',
      plan: n.plan || 'basico',
      precioMensual: Number(n.precio_mensual || 15),
      fechaVencimiento: n.fecha_vencimiento || '2027-12-31',
      limiteSucursales: n.limite_sucursales || 1,
      limiteUsuarios: n.limite_usuarios || 3,
      creadoEn: n.created_at,
    }));
  } catch (err) {
    console.warn('[SupabaseService] Error obteniendo negocios de Supabase:', err);
    return null;
  }
};

export const fetchLiveCashRegister = async (
  sucursalId?: string
): Promise<CashRegister | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    // 1. Obtener la caja activa de la sucursal o la primera caja activa
    let cajaQuery = client.from('cajas').select('*').eq('activa', true).limit(1);
    if (sucursalId && isValidUUID(sucursalId)) {
      cajaQuery = cajaQuery.eq('sucursal_id', sucursalId);
    }
    const { data: cajaData, error: cajaError } = await cajaQuery.maybeSingle();

    if (cajaError || !cajaData) {
      console.log('[SupabaseService] No se encontró ninguna caja activa registrada en Supabase.');
      return {
        id: '',
        nombre: 'Caja Principal (Sin caja en Supabase)',
        codigo: 'CAJA-01',
        estado: 'cerrada',
        aperturaActual: undefined,
      };
    }

    // 2. Buscar si esa caja tiene una apertura activa en la BD
    const { data: aperturaData, error: aperturaError } = await client
      .from('aperturas_caja')
      .select(`
        id,
        monto_inicial_efectivo,
        fecha_apertura,
        usuario_apertura_id,
        estado
      `)
      .eq('caja_id', cajaData.id)
      .eq('estado', 'abierta')
      .order('fecha_apertura', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (aperturaError || !aperturaData) {
      console.log(`[SupabaseService] La caja "${cajaData.nombre}" está CERRADA en Supabase.`);
      return {
        id: cajaData.id,
        nombre: cajaData.nombre,
        codigo: cajaData.codigo,
        estado: 'cerrada',
        aperturaActual: undefined,
      };
    }

    console.log(`[SupabaseService] Caja ABIERTA detectada en Supabase (Apertura ID: ${aperturaData.id})`);
    return {
      id: cajaData.id,
      nombre: cajaData.nombre,
      codigo: cajaData.codigo,
      estado: 'abierta',
      aperturaActual: {
        id: aperturaData.id,
        usuarioId: aperturaData.usuario_apertura_id,
        usuarioNombre: 'Cajero Activo',
        fechaApertura: aperturaData.fecha_apertura,
        montoInicial: Number(aperturaData.monto_inicial_efectivo || 0),
      },
    };
  } catch (err) {
    console.error('[SupabaseService] Error obteniendo estado de caja en Supabase:', err);
    return null;
  }
};

export const openLiveCashRegister = async (
  cajaId?: string,
  sucursalId?: string,
  usuarioId?: string,
  montoInicial: number = 0,
  notas?: string
): Promise<{ success: boolean; aperturaId?: string; caja?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  try {
    let finalCajaId = isValidUUID(cajaId) ? cajaId : null;

    // 1. Si no hay cajaId, buscar la caja activa por sucursal_id
    if (!finalCajaId && sucursalId && isValidUUID(sucursalId)) {
      const { data: sucursalCaja } = await client
        .from('cajas')
        .select('*')
        .eq('sucursal_id', sucursalId)
        .eq('activa', true)
        .limit(1)
        .maybeSingle();

      if (sucursalCaja && isValidUUID(sucursalCaja.id)) {
        finalCajaId = sucursalCaja.id;
      }
    }

    // 2. Si todavía no se encuentra, buscar cualquier caja activa
    if (!finalCajaId) {
      const { data: firstCaja } = await client.from('cajas').select('*').eq('activa', true).limit(1).maybeSingle();
      if (firstCaja && isValidUUID(firstCaja.id)) {
        finalCajaId = firstCaja.id;
      }
    }

    if (!finalCajaId) {
      return {
        success: false,
        error: 'No hay ninguna caja creada en la tabla "cajas" de Supabase. Crea una caja primero.',
      };
    }

    // Obtener información de la caja para retornar al estado
    const { data: cajaInfo } = await client.from('cajas').select('*').eq('id', finalCajaId).single();

    // 3. Resolver usuario_apertura_id (autenticado de auth.users si existe, o null si es PIN local)
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      caja_id: finalCajaId,
      monto_inicial_efectivo: montoInicial,
      estado: 'abierta',
      notas: notas || 'Apertura de turno desde POS',
    };
    if (finalUserId) {
      payload.usuario_apertura_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando apertura_caja:', payload);
    const { data, error } = await client
      .from('aperturas_caja')
      .insert(payload)
      .select('id, caja_id, monto_inicial_efectivo, fecha_apertura')
      .single();

    if (error) {
      console.error('[SupabaseService] Error abriendo turno de caja en Supabase:', error);
      return { success: false, error: error.message };
    }

    console.log('[SupabaseService] Apertura de caja exitosa en Supabase, ID:', data.id);
    return { success: true, aperturaId: data.id, caja: cajaInfo };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado abriendo caja' };
  }
};

// ==============================================================================
// 4.1. MOVIMIENTOS DE CAJA (INGRESOS Y RETIROS MANUALES)
// ==============================================================================

export const insertLiveCashMovement = async (
  aperturaCajaId: string,
  tipo: 'entrada_efectivo' | 'retiro_gasto' | 'retiro_deposito',
  monto: number,
  motivo: string,
  usuarioId?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(aperturaCajaId)) {
    return {
      success: false,
      error: 'No se puede registrar movimiento sin un turno de apertura de caja válido.',
    };
  }

  try {
    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      apertura_caja_id: aperturaCajaId,
      tipo,
      monto,
      motivo,
    };
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando movimiento_caja:', payload);
    const { data, error } = await client.from('movimientos_caja').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error insertando movimiento_caja:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando movimiento de caja' };
  }
};

export const fetchLiveCashMovements = async (
  aperturaCajaId?: string
): Promise<CashMovement[] | null> => {
  const client = getSupabaseClient();
  if (!client || !aperturaCajaId || !isValidUUID(aperturaCajaId)) return null;

  try {
    const { data, error } = await client
      .from('movimientos_caja')
      .select('*')
      .eq('apertura_caja_id', aperturaCajaId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((m: any) => ({
      id: m.id,
      aperturaId: m.apertura_caja_id,
      tipo: m.tipo,
      monto: Number(m.monto),
      motivo: m.motivo,
      usuarioNombre: 'Cajero',
      fecha: m.created_at,
    }));
  } catch (err) {
    console.error('[SupabaseService] Error consultando movimientos_caja:', err);
    return null;
  }
};

// ==============================================================================
// 4.2. GASTOS OPERATIVOS (INSERT & SELECT)
// ==============================================================================

export const insertLiveExpense = async (
  expenseData: {
    descripcion: string;
    monto: number;
    categoria: string;
    pagadoDesdeCaja?: boolean;
    comprobanteUrl?: string;
  },
  negocioId: string,
  sucursalId?: string,
  aperturaCajaId?: string,
  usuarioId?: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para registrar gasto.' };
  }

  try {
    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId) {
      const { data: firstSuc } = await client
        .from('sucursales')
        .select('id')
        .eq('negocio_id', negocioId)
        .limit(1)
        .maybeSingle();

      if (firstSuc && isValidUUID(firstSuc.id)) {
        finalSucursalId = firstSuc.id;
      }
    }

    if (!finalSucursalId) {
      return {
        success: false,
        error: 'No se encontró una sucursal válida para asociar el gasto.',
      };
    }

    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    const payload: any = {
      negocio_id: negocioId,
      sucursal_id: finalSucursalId,
      descripcion: expenseData.descripcion,
      monto: expenseData.monto,
      categoria: expenseData.categoria || 'otros',
      pagado_desde_caja: expenseData.pagadoDesdeCaja ?? true,
      comprobante_url: expenseData.comprobanteUrl || null,
      fecha_gasto: new Date().toISOString().split('T')[0],
    };

    if (isValidUUID(aperturaCajaId)) {
      payload.apertura_caja_id = aperturaCajaId;
    }
    if (finalUserId) {
      payload.usuario_id = finalUserId;
    }

    console.log('[SupabaseService] Insertando gasto operativo:', payload);
    const { data, error } = await client.from('gastos').insert(payload).select().single();

    if (error) {
      console.error('[SupabaseService] Error insertando gasto en Supabase:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando gasto' };
  }
};

export const fetchLiveExpenses = async (
  negocioId?: string,
  sucursalId?: string
): Promise<OperationalExpense[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('gastos').select('*').order('created_at', { ascending: false });
    if (negocioId && isValidUUID(negocioId)) {
      query = query.eq('negocio_id', negocioId);
    }
    if (sucursalId && isValidUUID(sucursalId)) {
      query = query.eq('sucursal_id', sucursalId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((g: any) => ({
      id: g.id,
      descripcion: g.descripcion,
      monto: Number(g.monto),
      categoria: g.categoria,
      pagadoDesdeCaja: Boolean(g.pagado_desde_caja),
      fecha: g.created_at || g.fecha_gasto,
      usuarioNombre: 'Cajero / Admin',
    }));
  } catch (err) {
    console.error('[SupabaseService] Error consultando gastos:', err);
    return null;
  }
};

export const closeLiveCashRegister = async (
  aperturaId: string,
  usuarioId: string,
  montoDeclarado: number,
  montoEsperado: number,
  diferencia: number,
  desglose?: any,
  notas?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  try {
    if (!isValidUUID(aperturaId)) {
      return { success: false, error: 'ID de apertura de caja inválido.' };
    }

    const { data: authData } = await client.auth.getUser();
    const finalUserId = authData?.user?.id || (isValidUUID(usuarioId) ? usuarioId : null);

    if (!finalUserId) {
      return {
        success: false,
        error: 'No se puede cerrar caja en Supabase sin un usuario autenticado válido.',
      };
    }

    // 1. Marcar apertura_caja como cerrada
    const { error: updateError } = await client
      .from('aperturas_caja')
      .update({ estado: 'cerrada' })
      .eq('id', aperturaId);

    if (updateError) {
      console.error('[SupabaseService] Error actualizando aperturas_caja:', updateError);
      return { success: false, error: updateError.message };
    }

    // 2. Registrar en cierres_caja
    const { error: insertCloseError } = await client.from('cierres_caja').insert({
      apertura_id: aperturaId,
      usuario_cierre_id: finalUserId,
      monto_declarado_efectivo: montoDeclarado,
      monto_esperado_efectivo: montoEsperado,
      diferencia_efectivo: diferencia,
      desglose_monedas_billetes: desglose || null,
      notas_cajero: notas || null,
    });

    if (insertCloseError) {
      console.warn('[SupabaseService] Advertencia en cierres_caja:', insertCloseError);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error cerrando caja' };
  }
};

// ==============================================================================
// 5. REGISTRO REAL DE VENTA EN SUPABASE (INSERT TRANSACCIONAL ESTRICTO)
// ==============================================================================

export const insertLiveSale = async (
  sale: Sale,
  negocioId: string,
  sucursalId?: string,
  aperturaCajaId?: string
): Promise<{ success: boolean; saleId?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    console.error('[SupabaseService] Error: Supabase no está configurado o conectado.');
    return { success: false, error: 'Supabase no conectado o credenciales no configuradas.' };
  }

  console.log('[SupabaseService] === INICIANDO VALIDACIÓN ESTRICTA DE VENTA ===');

  try {
    // 0. Obtener usuario autenticado en Supabase si existe
    const { data: authData } = await client.auth.getUser();
    const authUser = authData?.user;

    // A. Resolver y validar negocio_id real
    let finalNegocioId = isValidUUID(negocioId) ? negocioId : null;
    let userProfile: any = null;

    if (authUser) {
      const { data: prof } = await client
        .from('usuarios_perfiles')
        .select('negocio_id, sucursal_id')
        .eq('id', authUser.id)
        .maybeSingle();
      userProfile = prof;
      if (!finalNegocioId && prof && isValidUUID(prof.negocio_id)) {
        finalNegocioId = prof.negocio_id;
      }
    }

    if (!finalNegocioId) {
      const { data: firstNeg } = await client.from('negocios').select('id').limit(1).maybeSingle();
      if (firstNeg && isValidUUID(firstNeg.id)) {
        finalNegocioId = firstNeg.id;
      }
    }

    if (!finalNegocioId || !isValidUUID(finalNegocioId)) {
      return {
        success: false,
        error: 'No se encontró un ID de Negocio (UUID) válido en Supabase. Debes crear un negocio primero.',
      };
    }

    // B. Resolver y validar sucursal_id real
    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId && userProfile && isValidUUID(userProfile.sucursal_id)) {
      finalSucursalId = userProfile.sucursal_id;
    }
    if (!finalSucursalId) {
      const { data: branch } = await client
        .from('sucursales')
        .select('id')
        .eq('negocio_id', finalNegocioId)
        .limit(1)
        .maybeSingle();
      if (branch && isValidUUID(branch.id)) {
        finalSucursalId = branch.id;
      }
    }

    if (!finalSucursalId || !isValidUUID(finalSucursalId)) {
      return {
        success: false,
        error: 'No se encontró una Sucursal (UUID) válida en Supabase para este negocio. Debes dar de alta una sucursal.',
      };
    }

    // C. Resolver y validar apertura_caja_id real
    let finalAperturaCajaId = isValidUUID(aperturaCajaId) ? aperturaCajaId : null;
    if (!finalAperturaCajaId) {
      const { data: activeApertura } = await client
        .from('aperturas_caja')
        .select('id')
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeApertura && isValidUUID(activeApertura.id)) {
        finalAperturaCajaId = activeApertura.id;
      }
    }

    if (!finalAperturaCajaId || !isValidUUID(finalAperturaCajaId)) {
      return {
        success: false,
        error: 'No hay ningún turno de caja abierto en Supabase. Debes abrir caja primero en el panel de Control de Caja.',
      };
    }

    // D. Resolver cajero_id
    let finalCajeroId: string | null = null;
    if (authUser && isValidUUID(authUser.id)) {
      finalCajeroId = authUser.id;
    } else if (isValidUUID(sale.cajeroId)) {
      finalCajeroId = sale.cajeroId;
    }

    // E. Resolver cliente_id
    const finalClienteId = isValidUUID(sale.clienteId) ? sale.clienteId : null;

    // F. Validar estrictamente los productos y presentaciones del carrito
    for (const item of sale.items) {
      if (!isValidUUID(item.producto.id)) {
        return {
          success: false,
          error: `El producto "${item.producto.nombre}" tiene un ID simulado (${item.producto.id}). Solo se permiten productos reales con UUID de Supabase.`,
        };
      }
      if (!isValidUUID(item.presentacion.id)) {
        return {
          success: false,
          error: `La presentación "${item.presentacion.nombre}" del producto "${item.producto.nombre}" tiene un ID simulado (${item.presentacion.id}). Debe provenir de la tabla "presentaciones_producto" de Supabase.`,
        };
      }
    }

    // 1. Preparar Payload del Encabezado de Venta
    const ventaPayload = {
      negocio_id: finalNegocioId,
      sucursal_id: finalSucursalId,
      apertura_caja_id: finalAperturaCajaId,
      cliente_id: finalClienteId,
      numero_ticket: sale.numeroTicket,
      tipo_venta: sale.tipoVenta,
      estado: 'completada',
      subtotal: sale.subtotal,
      descuento: sale.descuento,
      impuesto: sale.impuesto,
      total: sale.total,
      costo_total_estimado: sale.costoTotal,
      utilidad_bruta_estimada: sale.utilidadEstimada,
      cajero_id: finalCajeroId,
      notas: sale.notas || null,
    };

    console.log('[SupabaseService] Insertando venta real en "ventas":', ventaPayload);

    const { data: ventaData, error: ventaError } = await client
      .from('ventas')
      .insert(ventaPayload)
      .select('id')
      .single();

    console.log('[SupabaseService] Respuesta de Supabase (ventas insert):', {
      data: ventaData,
      error: ventaError,
    });

    if (ventaError) {
      console.error('[SupabaseService] Error estricto en tabla "ventas":', ventaError);
      return {
        success: false,
        error: `[Supabase Error ${ventaError.code || ''}] ${ventaError.message}${
          ventaError.details ? ` (${ventaError.details})` : ''
        }`,
      };
    }

    if (!ventaData?.id) {
      return { success: false, error: 'Supabase no devolvió el ID de la venta creada.' };
    }

    const newVentaId = ventaData.id;

    // 2. Insertar Detalles de Venta ('venta_detalles')
    const detallesToInsert = sale.items.map(item => ({
      venta_id: newVentaId,
      producto_id: item.producto.id,
      presentacion_id: item.presentacion.id,
      cantidad: item.cantidad,
      factor_conversion: item.presentacion.factorConversion,
      precio_unitario: item.precioUnitario,
      costo_unitario_base: item.costoUnitarioBase,
      descuento_unitario: item.descuentoUnitario,
      subtotal: item.subtotal,
    }));

    console.log('[SupabaseService] Insertando detalles en "venta_detalles":', detallesToInsert);
    const { data: detallesData, error: detallesError } = await client
      .from('venta_detalles')
      .insert(detallesToInsert)
      .select('id');

    console.log('[SupabaseService] Respuesta de Supabase (venta_detalles insert):', {
      data: detallesData,
      error: detallesError,
    });

    if (detallesError) {
      console.error('[SupabaseService] Error insertando venta_detalles:', detallesError);
      return {
        success: false,
        saleId: newVentaId,
        error: `Venta registrada (#${sale.numeroTicket}), pero falló al guardar detalles: [${detallesError.code}] ${detallesError.message}`,
      };
    }

    // 3. Insertar método de pago en 'pagos_venta' si aplica
    if (sale.pagos && sale.pagos.length > 0) {
      const { data: metodos } = await client.from('metodos_pago').select('id, codigo');
      const metodoMap = new Map((metodos || []).map((m: any) => [m.codigo, m.id]));

      const pagosToInsert = sale.pagos
        .map(p => ({
          venta_id: newVentaId,
          metodo_pago_id: metodoMap.get(p.metodoPago) || metodos?.[0]?.id,
          monto: p.monto,
          monto_recibido: p.montoRecibido || p.monto,
          cambio_devuelto: p.cambio || 0,
          referencia: p.referencia || null,
        }))
        .filter(p => Boolean(p.metodo_pago_id));

      if (pagosToInsert.length > 0) {
        console.log('[SupabaseService] Insertando pagos en "pagos_venta":', pagosToInsert);
        const { data: pagosData, error: pagosError } = await client
          .from('pagos_venta')
          .insert(pagosToInsert)
          .select('id');

        console.log('[SupabaseService] Respuesta de Supabase (pagos_venta insert):', {
          data: pagosData,
          error: pagosError,
        });

        if (pagosError) {
          console.warn('[SupabaseService] Advertencia al insertar pagos_venta:', pagosError);
        }
      }
    }

    // 4. Si fue venta al fiado, actualizar saldo deudor del cliente
    if (sale.tipoVenta === 'credito_fiado' && finalClienteId) {
      const { data: clienteActual } = await client
        .from('clientes')
        .select('saldo_deudor_actual')
        .eq('id', finalClienteId)
        .single();

      if (clienteActual) {
        const nuevoSaldo = Number(clienteActual.saldo_deudor_actual || 0) + sale.total;
        await client
          .from('clientes')
          .update({ saldo_deudor_actual: nuevoSaldo })
          .eq('id', finalClienteId);
      }
    }

    console.log('[SupabaseService] ¡Venta real registrada con éxito en Supabase! ID:', newVentaId);
    return { success: true, saleId: newVentaId };
  } catch (err: any) {
    console.error('[SupabaseService] Excepción crítica durante insertLiveSale:', err);
    return { success: false, error: err.message || 'Error inesperado guardando en Supabase' };
  }
};

// ==============================================================================
// 5. ESCÁNER MÓVIL REALTIME BROADCAST
// ==============================================================================

export const setupScannerBroadcast = (
  cajaToken: string,
  onBarcodeReceived: (barcode: string) => void,
  onStatusChange?: (status: 'conectado' | 'esperando') => void
) => {
  const client = getSupabaseClient();
  const channelName = `pos-scanner-${cajaToken}`;

  if (client) {
    if (activeScannerChannel) {
      client.removeChannel(activeScannerChannel);
    }

    activeScannerChannel = client.channel(channelName, {
      config: { broadcast: { self: false } },
    });

    activeScannerChannel
      .on('broadcast', { event: 'barcode-scan' }, (payload) => {
        if (payload?.payload?.barcode) {
          onBarcodeReceived(payload.payload.barcode);
        }
      })
      .on('broadcast', { event: 'scanner-status' }, (payload) => {
        if (payload?.payload?.status && onStatusChange) {
          onStatusChange(payload.payload.status);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && onStatusChange) {
          onStatusChange('esperando');
        }
      });
  }

  // Fallback local broadcast channel para pruebas en el mismo navegador/red
  if ('BroadcastChannel' in window) {
    const localChannel = new BroadcastChannel(channelName);
    localChannel.onmessage = (event) => {
      if (event.data?.barcode) {
        onBarcodeReceived(event.data.barcode);
      }
      if (event.data?.status && onStatusChange) {
        onStatusChange(event.data.status);
      }
    };
  }

  return () => {
    if (client && activeScannerChannel) {
      client.removeChannel(activeScannerChannel);
    }
  };
};

export const emitBarcodeFromMobile = async (cajaToken: string, barcode: string) => {
  const channelName = `pos-scanner-${cajaToken}`;
  const client = getSupabaseClient();

  if (client && activeScannerChannel) {
    await activeScannerChannel.send({
      type: 'broadcast',
      event: 'barcode-scan',
      payload: { barcode, timestamp: Date.now() },
    });
  }

  if ('BroadcastChannel' in window) {
    const localChannel = new BroadcastChannel(channelName);
    localChannel.postMessage({ barcode, timestamp: Date.now() });
  }
};

// ==============================================================================
// 6. CATÁLOGO, PRESENTACIONES E INVENTARIO EN VIVO (INSERT, UPDATE, DELETE)
// ==============================================================================

export const insertLiveProduct = async (
  productData: {
    nombre: string;
    categoriaId?: string;
    unidadMedidaBase?: string;
    codigoBarras?: string;
    precioCosto: number;
    precioVenta: number;
    stockInicial: number;
    permiteDecimales?: boolean;
    esFavorito?: boolean;
    stockMinimo?: number;
    stockMaximo?: number;
  },
  negocioId: string,
  sucursalId?: string
): Promise<{ success: boolean; product?: Product; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no está conectado.' };

  try {
    let finalNegocioId = isValidUUID(negocioId) ? negocioId : null;
    if (!finalNegocioId) {
      const { data: firstNeg } = await client.from('negocios').select('id').limit(1).maybeSingle();
      if (firstNeg && isValidUUID(firstNeg.id)) {
        finalNegocioId = firstNeg.id;
      }
    }

    if (!finalNegocioId) {
      return { success: false, error: 'No se encontró un Negocio válido en Supabase para asociar el producto.' };
    }

    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId) {
      const { data: firstSuc } = await client.from('sucursales').select('id').eq('negocio_id', finalNegocioId).limit(1).maybeSingle();
      if (firstSuc && isValidUUID(firstSuc.id)) {
        finalSucursalId = firstSuc.id;
      }
    }

    // 1. Insertar Producto en tabla 'productos'
    const prodPayload = {
      negocio_id: finalNegocioId,
      categoria_id: isValidUUID(productData.categoriaId) ? productData.categoriaId : null,
      nombre: productData.nombre.trim(),
      unidad_medida_base: productData.unidadMedidaBase || 'unidad',
      permite_decimales: productData.permiteDecimales ?? false,
      es_favorito: productData.esFavorito ?? true,
      stock_minimo: productData.stockMinimo ?? 5,
      stock_maximo: productData.stockMaximo ?? 100,
      perecedero: false,
    };

    console.log('[SupabaseService] Insertando producto live:', prodPayload);
    const { data: prodRow, error: prodErr } = await client
      .from('productos')
      .insert(prodPayload)
      .select()
      .single();

    if (prodErr || !prodRow) {
      console.error('[SupabaseService] Error creando producto:', prodErr);
      return { success: false, error: prodErr?.message || 'Error al guardar producto en Supabase' };
    }

    // 2. Insertar Presentación Base en 'presentaciones_producto'
    const presPayload = {
      producto_id: prodRow.id,
      nombre: 'Unidad',
      factor_conversion: 1.0,
      codigo_barras: productData.codigoBarras?.trim() || null,
      precio_costo: productData.precioCosto,
      precio_venta: productData.precioVenta,
      es_presentacion_base: true,
      activo: true,
    };

    const { data: presRow, error: presErr } = await client
      .from('presentaciones_producto')
      .insert(presPayload)
      .select()
      .single();

    if (presErr || !presRow) {
      console.error('[SupabaseService] Error creando presentación base:', presErr);
      return { success: false, error: presErr?.message || 'Error al crear presentación en Supabase' };
    }

    // 3. Crear fila de existencias si hay sucursal
    if (finalSucursalId) {
      const stockQty = productData.stockInicial || 0;
      await client.from('existencias').upsert({
        sucursal_id: finalSucursalId,
        producto_id: prodRow.id,
        cantidad_disponible: stockQty,
      });

      if (stockQty > 0) {
        await client.from('movimientos_inventario').insert({
          sucursal_id: finalSucursalId,
          producto_id: prodRow.id,
          tipo_movimiento: 'ajuste_positivo',
          cantidad: stockQty,
          costo_unitario: productData.precioCosto,
          motivo: 'Inventario inicial al crear producto',
        });
      }
    }

    const createdProduct: Product = {
      id: prodRow.id,
      categoriaId: prodRow.categoria_id || '',
      nombre: prodRow.nombre,
      descripcion: prodRow.descripcion,
      unidadMedidaBase: prodRow.unidad_medida_base,
      permiteDecimales: Boolean(prodRow.permite_decimales),
      esFavorito: Boolean(prodRow.es_favorito),
      stockMinimo: Number(prodRow.stock_minimo),
      stockMaximo: Number(prodRow.stock_maximo),
      perecedero: Boolean(prodRow.perecedero),
      existenciaBase: productData.stockInicial || 0,
      presentaciones: [
        {
          id: presRow.id,
          productoId: prodRow.id,
          nombre: presRow.nombre,
          factorConversion: Number(presRow.factor_conversion),
          codigoBarras: presRow.codigo_barras || '',
          precioCosto: Number(presRow.precio_costo),
          precioVenta: Number(presRow.precio_venta),
          esPresentacionBase: true,
          activo: true,
        },
      ],
    };

    return { success: true, product: createdProduct };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado insertando producto' };
  }
};

export const insertLivePresentation = async (
  productoId: string,
  data: {
    nombre: string;
    factorConversion: number;
    codigoBarras?: string;
    precioCosto: number;
    precioVenta: number;
  }
): Promise<{ success: boolean; presentation?: ProductPresentation; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(productoId)) {
    return { success: false, error: 'ID de producto inválido para asociar presentación.' };
  }

  try {
    const payload = {
      producto_id: productoId,
      nombre: data.nombre.trim(),
      factor_conversion: data.factorConversion || 1.0,
      codigo_barras: data.codigoBarras?.trim() || null,
      precio_costo: data.precioCosto || 0,
      precio_venta: data.precioVenta,
      es_presentacion_base: false,
      activo: true,
    };

    const { data: presRow, error } = await client
      .from('presentaciones_producto')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    const createdPresentation: ProductPresentation = {
      id: presRow.id,
      productoId: presRow.producto_id,
      nombre: presRow.nombre,
      factorConversion: Number(presRow.factor_conversion),
      codigoBarras: presRow.codigo_barras || '',
      precioCosto: Number(presRow.precio_costo),
      precioVenta: Number(presRow.precio_venta),
      esPresentacionBase: Boolean(presRow.es_presentacion_base),
      activo: Boolean(presRow.activo),
    };

    return { success: true, presentation: createdPresentation };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado insertando presentación' };
  }
};

export const deleteLivePresentation = async (presId: string): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(presId)) {
    return { success: false, error: 'ID de presentación inválido.' };
  }

  try {
    const { error } = await client.from('presentaciones_producto').delete().eq('id', presId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error eliminando presentación' };
  }
};

export const updateLiveProduct = async (product: Product, sucursalId?: string): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(product.id)) {
    return { success: false, error: 'ID de producto no es un UUID válido.' };
  }

  try {
    const { error: prodErr } = await client
      .from('productos')
      .update({
        nombre: product.nombre,
        unidad_medida_base: product.unidadMedidaBase,
        permite_decimales: product.permiteDecimales,
        es_favorito: product.esFavorito,
        stock_minimo: product.stockMinimo,
        stock_maximo: product.stockMaximo,
      })
      .eq('id', product.id);

    if (prodErr) return { success: false, error: prodErr.message };

    // Si se pasa sucursal, actualizar la cantidad en existencias
    if (sucursalId && isValidUUID(sucursalId)) {
      await client.from('existencias').upsert({
        sucursal_id: sucursalId,
        producto_id: product.id,
        cantidad_disponible: product.existenciaBase,
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error actualizando producto en Supabase' };
  }
};

export const fetchLiveKardex = async (_negocioId?: string, sucursalId?: string): Promise<KardexMovement[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
      .from('movimientos_inventario')
      .select(`
        id,
        tipo_movimiento,
        cantidad,
        costo_unitario,
        motivo,
        referencia_tipo,
        referencia_id,
        created_at,
        productos (
          id,
          nombre
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (sucursalId && isValidUUID(sucursalId)) {
      query = query.eq('sucursal_id', sucursalId);
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((m: any) => {
      const prod = m.productos as any;
      let kardexTipo: KardexMovement['tipo'] = 'venta';
      if (m.tipo_movimiento === 'venta') kardexTipo = 'venta';
      else if (m.tipo_movimiento === 'compra') kardexTipo = 'compra';
      else if (m.tipo_movimiento === 'ajuste_positivo') kardexTipo = 'ajuste_positivo';
      else if (m.tipo_movimiento === 'ajuste_negativo') kardexTipo = 'ajuste_negativo';
      else if (m.tipo_movimiento === 'merma') kardexTipo = 'merma';
      else if (m.tipo_movimiento === 'conteo_fisico') kardexTipo = 'conteo_fisico';

      return {
        id: m.id,
        fecha: m.created_at,
        productoId: prod?.id || '',
        productoNombre: prod?.nombre || 'Producto',
        tipo: kardexTipo,
        cantidadBase: Number(m.cantidad || 0),
        saldoAnterior: 0,
        saldoNuevo: 0,
        costoUnitarioBase: Number(m.costo_unitario || 0),
        referencia: m.motivo || m.referencia_tipo || 'Movimiento',
        usuario: 'Sistema',
      };
    });
  } catch (err) {
    console.warn('[SupabaseService] Error consultando Kardex:', err);
    return null;
  }
};

// ==============================================================================
// 7. GESTIÓN SAAS SUPER ADMIN (TENANTS LIVE)
// ==============================================================================

export const updateLiveTenantStatus = async (
  tenantId: string,
  status: SubscriptionStatus,
  fechaVencimiento?: string
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(tenantId)) {
    return { success: false, error: 'ID de negocio inválido.' };
  }

  try {
    const payload: any = { estado_suscripcion: status };
    if (fechaVencimiento) {
      payload.fecha_vencimiento = fechaVencimiento;
    }

    const { error } = await client.from('negocios').update(payload).eq('id', tenantId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error actualizando suscripción de negocio' };
  }
};

export const updateLiveTenantPlan = async (
  tenantId: string,
  plan: SubscriptionPlan,
  precioMensual?: number
): Promise<{ success: boolean; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(tenantId)) {
    return { success: false, error: 'ID de negocio inválido.' };
  }

  try {
    const payload: any = { plan };
    if (precioMensual !== undefined) {
      payload.precio_mensual = precioMensual;
    }

    const { error } = await client.from('negocios').update(payload).eq('id', tenantId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error actualizando plan' };
  }
};

export const insertLiveTenant = async (
  tenantData: Omit<SaaSTenant, 'id' | 'creadoEn'>
): Promise<{ success: boolean; tenant?: SaaSTenant; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  try {
    const payload = {
      nombre: tenantData.nombre,
      nombre_comercial: tenantData.nombreComercial || tenantData.nombre,
      email: tenantData.email,
      telefono: tenantData.telefono,
      whatsapp: tenantData.whatsapp || null,
      direccion: tenantData.direccion || null,
      estado_suscripcion: tenantData.estadoSuscripcion || 'activa',
      plan: tenantData.plan || 'basico',
      precio_mensual: tenantData.precioMensual || 15.0,
      fecha_vencimiento: tenantData.fechaVencimiento || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      limite_sucursales: tenantData.limiteSucursales || 1,
      limite_usuarios: tenantData.limiteUsuarios || 3,
      activo: true,
    };

    const { data: negData, error: negErr } = await client
      .from('negocios')
      .insert(payload)
      .select()
      .single();

    if (negErr || !negData) {
      return { success: false, error: negErr?.message || 'Error registrando negocio' };
    }

    // Crear sucursal matriz y caja por defecto
    const { data: sucData } = await client
      .from('sucursales')
      .insert({
        negocio_id: negData.id,
        codigo: 'SUC-01',
        nombre: 'Sucursal Central',
        direccion: tenantData.direccion || 'Principal',
        es_matriz: true,
        activa: true,
      })
      .select('id')
      .single();

    if (sucData?.id) {
      await client.from('cajas').insert({
        sucursal_id: sucData.id,
        codigo: 'CAJA-01',
        nombre: 'Caja 01 - Mostrador',
        activa: true,
      });
    }

    const newTenant: SaaSTenant = {
      id: negData.id,
      nombre: negData.nombre,
      nombreComercial: negData.nombre_comercial,
      propietarioNombre: tenantData.propietarioNombre || 'Propietario',
      email: negData.email || '',
      telefono: negData.telefono || '',
      whatsapp: negData.whatsapp || '',
      direccion: negData.direccion || '',
      estadoSuscripcion: negData.estado_suscripcion,
      plan: negData.plan,
      precioMensual: Number(negData.precio_mensual),
      fechaVencimiento: negData.fecha_vencimiento,
      limiteSucursales: negData.limite_sucursales,
      limiteUsuarios: negData.limite_usuarios,
      creadoEn: negData.created_at,
    };

    return { success: true, tenant: newTenant };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error creando inquilino' };
  }
};

// ==============================================================================
// 8. PROVEEDORES Y RECEPCIÓN DE COMPRAS EN VIVO
// ==============================================================================

export const fetchLiveSuppliers = async (negocioId?: string): Promise<Supplier[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client.from('proveedores').select('*').order('nombre_comercial');
    if (negocioId && isValidUUID(negocioId)) {
      query = query.eq('negocio_id', negocioId);
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((s: any) => ({
      id: s.id,
      negocioId: s.negocio_id,
      nombreComercial: s.nombre_comercial,
      razonSocial: s.razon_social,
      ruc: s.ruc,
      contactoNombre: s.contacto_nombre,
      telefono: s.telefono,
      email: s.email,
      direccion: s.direccion,
      diasCredito: Number(s.dias_credito || 0),
      saldoPendiente: Number(s.saldo_pendiente || 0),
      activo: Boolean(s.activo),
    }));
  } catch (err) {
    console.warn('[SupabaseService] Error consultando proveedores:', err);
    return null;
  }
};

export const insertLiveSupplier = async (
  supplierData: {
    nombreComercial: string;
    razonSocial?: string;
    ruc?: string;
    contactoNombre?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    diasCredito?: number;
  },
  negocioId: string
): Promise<{ success: boolean; supplier?: Supplier; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para crear proveedor.' };
  }

  try {
    const payload = {
      negocio_id: negocioId,
      nombre_comercial: supplierData.nombreComercial.trim(),
      razon_social: supplierData.razonSocial?.trim() || null,
      ruc: supplierData.ruc?.trim() || null,
      contacto_nombre: supplierData.contactoNombre?.trim() || null,
      telefono: supplierData.telefono?.trim() || null,
      email: supplierData.email?.trim() || null,
      direccion: supplierData.direccion?.trim() || null,
      dias_credito: supplierData.diasCredito || 0,
      saldo_pendiente: 0.0,
      activo: true,
    };

    const { data, error } = await client.from('proveedores').insert(payload).select().single();
    if (error || !data) return { success: false, error: error?.message || 'Error guardando proveedor' };

    const newSup: Supplier = {
      id: data.id,
      negocioId: data.negocio_id,
      nombreComercial: data.nombre_comercial,
      razonSocial: data.razon_social,
      ruc: data.ruc,
      contactoNombre: data.contacto_nombre,
      telefono: data.telefono,
      email: data.email,
      direccion: data.direccion,
      diasCredito: Number(data.dias_credito),
      saldoPendiente: Number(data.saldo_pendiente),
      activo: Boolean(data.activo),
    };

    return { success: true, supplier: newSup };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error inesperado registrando proveedor' };
  }
};

export const fetchLivePurchases = async (
  negocioId?: string,
  sucursalId?: string
): Promise<Purchase[] | null> => {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    let query = client
      .from('compras')
      .select(`
        id,
        numero_factura,
        fecha_emision,
        tipo_pago,
        estado,
        total,
        observaciones,
        proveedor_id,
        proveedores ( nombre_comercial ),
        compra_detalles (
          id,
          producto_id,
          presentacion_id,
          cantidad,
          factor_conversion,
          costo_unitario,
          subtotal,
          productos ( nombre ),
          presentaciones_producto ( nombre )
        )
      `)
      .order('fecha_emision', { ascending: false })
      .limit(50);

    if (negocioId && isValidUUID(negocioId)) {
      query = query.eq('negocio_id', negocioId);
    }
    if (sucursalId && isValidUUID(sucursalId)) {
      query = query.eq('sucursal_id', sucursalId);
    }

    const { data, error } = await query;
    if (error || !data) return null;

    return data.map((c: any) => ({
      id: c.id,
      proveedorId: c.proveedor_id,
      proveedorNombre: c.proveedores?.nombre_comercial || 'Proveedor',
      numeroFactura: c.numero_factura || 'S/N',
      fechaEmision: c.fecha_emision,
      tipoPago: c.tipo_pago || 'contado',
      estado: c.estado || 'recibida',
      total: Number(c.total || 0),
      observaciones: c.observaciones,
      items: (c.compra_detalles || []).map((d: any) => ({
        id: d.id,
        productoId: d.producto_id,
        productoNombre: d.productos?.nombre || 'Producto',
        presentacionId: d.presentacion_id,
        presentacionNombre: d.presentaciones_producto?.nombre || 'Presentación',
        cantidad: Number(d.cantidad || 0),
        factorConversion: Number(d.factor_conversion || 1),
        costoUnitario: Number(d.costo_unitario || 0),
        subtotal: Number(d.subtotal || 0),
      })),
    }));
  } catch (err) {
    console.warn('[SupabaseService] Error consultando compras:', err);
    return null;
  }
};

export const insertLivePurchase = async (
  purchaseData: {
    proveedorId: string;
    numeroFactura?: string;
    tipoPago: 'contado' | 'credito';
    observaciones?: string;
    items: {
      productoId: string;
      presentacionId: string;
      cantidad: number;
      factorConversion: number;
      costoUnitario: number;
      subtotal: number;
    }[];
  },
  negocioId: string,
  sucursalId?: string,
  usuarioId?: string
): Promise<{ success: boolean; purchaseId?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(negocioId)) {
    return { success: false, error: 'ID de negocio inválido para registrar compra.' };
  }

  try {
    let finalSucursalId = isValidUUID(sucursalId) ? sucursalId : null;
    if (!finalSucursalId) {
      const { data: firstSuc } = await client.from('sucursales').select('id').eq('negocio_id', negocioId).limit(1).maybeSingle();
      if (firstSuc && isValidUUID(firstSuc.id)) {
        finalSucursalId = firstSuc.id;
      }
    }

    if (!finalSucursalId) {
      return { success: false, error: 'No se encontró una sucursal para ingresar la mercadería.' };
    }

    const totalCompra = purchaseData.items.reduce((sum, item) => sum + item.subtotal, 0);

    // 1. Insertar Cabecera de Compra
    const compraPayload: any = {
      negocio_id: negocioId,
      sucursal_id: finalSucursalId,
      proveedor_id: purchaseData.proveedorId,
      numero_factura: purchaseData.numeroFactura || null,
      fecha_emision: new Date().toISOString().split('T')[0],
      tipo_pago: purchaseData.tipoPago || 'contado',
      estado: 'recibida',
      subtotal: totalCompra,
      total: totalCompra,
      observaciones: purchaseData.observaciones || null,
    };

    if (isValidUUID(usuarioId)) {
      compraPayload.usuario_id = usuarioId;
    }

    const { data: compraRow, error: compraErr } = await client
      .from('compras')
      .insert(compraPayload)
      .select('id')
      .single();

    if (compraErr || !compraRow) {
      return { success: false, error: compraErr?.message || 'Error guardando cabecera de compra' };
    }

    const newCompraId = compraRow.id;

    // 2. Insertar Detalles de Compra
    const detalles = purchaseData.items.map(i => ({
      compra_id: newCompraId,
      producto_id: i.productoId,
      presentacion_id: i.presentacionId,
      cantidad: i.cantidad,
      factor_conversion: i.factorConversion,
      costo_unitario: i.costoUnitario,
      subtotal: i.subtotal,
    }));

    const { error: detErr } = await client.from('compra_detalles').insert(detalles);
    if (detErr) {
      return { success: false, error: `Compra registrada (#${newCompraId}), pero falló detalles: ${detErr.message}` };
    }

    // 3. Afectar Inventario en 'existencias' y registrar en 'movimientos_inventario'
    for (const item of purchaseData.items) {
      const cantidadBase = item.cantidad * item.factorConversion;

      // Obtener existencia actual
      const { data: exRow } = await client
        .from('existencias')
        .select('cantidad_disponible')
        .eq('sucursal_id', finalSucursalId)
        .eq('producto_id', item.productoId)
        .maybeSingle();

      const currentStock = Number(exRow?.cantidad_disponible || 0);
      const newStock = currentStock + cantidadBase;

      await client.from('existencias').upsert({
        sucursal_id: finalSucursalId,
        producto_id: item.productoId,
        cantidad_disponible: newStock,
      });

      // Kardex
      await client.from('movimientos_inventario').insert({
        sucursal_id: finalSucursalId,
        producto_id: item.productoId,
        tipo_movimiento: 'compra',
        cantidad: cantidadBase,
        costo_unitario: item.costoUnitario,
        referencia_tipo: 'compras',
        referencia_id: newCompraId,
        motivo: `Recepción de mercadería factura #${purchaseData.numeroFactura || 'S/N'}`,
      });
    }

    return { success: true, purchaseId: newCompraId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error procesando recepción de compra' };
  }
};

// ==============================================================================
// 9. CONTEO FÍSICO Y AUDITORÍA DE INVENTARIO EN VIVO
// ==============================================================================

export const saveLivePhysicalAudit = async (
  sucursalId: string,
  counts: Record<string, number>,
  products: Product[],
  usuarioId?: string,
  notas?: string
): Promise<{ success: boolean; auditId?: string; error?: string }> => {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase no conectado.' };

  if (!isValidUUID(sucursalId)) {
    return { success: false, error: 'ID de sucursal inválido para guardar auditoría física.' };
  }

  try {
    // 1. Crear cabecera en 'conteos_fisicos'
    const conteoPayload: any = {
      sucursal_id: sucursalId,
      titulo: `Auditoría Física ${new Date().toLocaleDateString('es-NI')}`,
      estado: 'aplicado',
      fecha_cierre: new Date().toISOString(),
      notas: notas || 'Ajuste de inventario físico completado desde panel',
    };

    if (isValidUUID(usuarioId)) {
      conteoPayload.usuario_creador_id = usuarioId;
      conteoPayload.usuario_aprobador_id = usuarioId;
    }

    const { data: auditRow, error: auditErr } = await client
      .from('conteos_fisicos')
      .insert(conteoPayload)
      .select('id')
      .single();

    if (auditErr || !auditRow) {
      return { success: false, error: auditErr?.message || 'Error guardando auditoría física' };
    }

    const auditId = auditRow.id;

    // 2. Iterar sobre productos ajustados
    for (const prod of products) {
      if (counts[prod.id] !== undefined) {
        const stockContado = counts[prod.id];
        const stockSistema = prod.existenciaBase;
        const diferencia = stockContado - stockSistema;

        // Guardar detalle
        await client.from('conteo_detalles').insert({
          conteo_id: auditId,
          producto_id: prod.id,
          stock_sistema_base: stockSistema,
          stock_contado_base: stockContado,
          ajuste_aplicado: true,
        });

        // Actualizar existencias
        await client.from('existencias').upsert({
          sucursal_id: sucursalId,
          producto_id: prod.id,
          cantidad_disponible: stockContado,
        });

        // Kardex si hay diferencia
        if (diferencia !== 0) {
          const tipoMov = diferencia > 0 ? 'ajuste_positivo' : 'ajuste_negativo';
          const motivo = diferencia > 0 ? 'Sobrante detectado en conteo físico' : 'Faltante / Merma detectada en conteo físico';

          await client.from('movimientos_inventario').insert({
            sucursal_id: sucursalId,
            producto_id: prod.id,
            tipo_movimiento: tipoMov,
            cantidad: Math.abs(diferencia),
            referencia_tipo: 'conteos_fisicos',
            referencia_id: auditId,
            motivo: `${motivo} (Sistema: ${stockSistema} -> Físico: ${stockContado})`,
          });
        }
      }
    }

    return { success: true, auditId };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error aplicando ajuste de inventario' };
  }
};
